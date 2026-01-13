import { useState, useEffect } from "react";
import { Link2, Copy, Check, Trash2, Loader2, ToggleLeft, ToggleRight, Users, Percent, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AffiliateLink {
  id: string;
  affiliate_code: string;
  affiliate_link: string;
  commission_percent: number;
  is_active: boolean;
  created_at: string;
  times_used: number;
  total_indicados: number;
}

export function AdminAffiliateLinkGenerator() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Base URL for affiliate links
  const baseUrl = window.location.origin;

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'affiliate_links');

      if (error) throw error;

      if (data && data.length > 0 && data[0].value) {
        const parsedLinks = JSON.parse(data[0].value);
        const updatedLinks = parsedLinks.map((link: any) => ({
          ...link,
          total_indicados: link.total_indicados || link.times_used || 0,
        }));
        setLinks(updatedLinks);
      }
    } catch (error) {
      console.error('Error loading affiliate links:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveLinks = async (newLinks: AffiliateLink[]) => {
    // Check if user is authenticated first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'affiliate_links',
        value: JSON.stringify(newLinks),
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      console.error('Error saving affiliate links:', error);
      throw new Error(error.message || 'Erro ao salvar links');
    }
    
    setLinks(newLinks);
    
    // Log admin action
    await supabase.from('admin_logs').insert({
      admin_id: user.id,
      action: 'affiliate_link_updated',
      details: { links_count: newLinks.length }
    });
  };

  const generateLink = async () => {
    setIsGenerating(true);
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      // Generate unique code (INV-XXXX format)
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const code = `INV-${randomNum}`;
      
      const newLink: AffiliateLink = {
        id: crypto.randomUUID(),
        affiliate_code: code,
        affiliate_link: `${baseUrl}/affiliate-signup?ref=${code}`,
        commission_percent: 50, // Fixed 50% commission
        is_active: true,
        created_at: new Date().toISOString(),
        times_used: 0,
        total_indicados: 0,
      };

      await saveLinks([...links, newLink]);
      
      // Copy link to clipboard automatically
      await navigator.clipboard.writeText(newLink.affiliate_link);
      setCopiedId(newLink.id);
      setTimeout(() => setCopiedId(null), 3000);
      
      toast.success("Link gerado e copiado! Envie para o afiliado se cadastrar.", {
        duration: 5000,
      });
    } catch (error: any) {
      console.error('Error generating affiliate link:', error);
      toast.error(error?.message || "Erro ao gerar link de afiliado");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleLinkStatus = async (linkId: string) => {
    try {
      const updatedLinks = links.map(link => 
        link.id === linkId ? { ...link, is_active: !link.is_active } : link
      );
      await saveLinks(updatedLinks);
      toast.success("Status do link atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const deleteLink = async (linkId: string) => {
    try {
      const updatedLinks = links.filter(link => link.id !== linkId);
      await saveLinks(updatedLinks);
      toast.success("Link removido com sucesso!");
    } catch (error) {
      toast.error("Erro ao remover link");
    }
  };

  const copyToClipboard = async (link: string, id: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success("Link copiado! Envie para o afiliado se cadastrar.");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with prominent button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2 text-white">
            <Link2 className="w-6 h-6 text-primary" />
            Gerar Link de Afiliado
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Gere um link exclusivo para o afiliado se cadastrar no INOVAFINANCE com a aba Afiliados já ativada.
          </p>
        </div>
        
        {/* Main CTA Button - 1 Click Generate */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={generateLink}
            disabled={isGenerating}
            size="lg"
            className="h-14 px-8 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white font-bold text-lg shadow-lg shadow-purple-500/25 transition-all duration-300"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Link2 className="w-5 h-5 mr-2" />
                🔗 Gerar Link de Afiliado
              </>
            )}
          </Button>
        </motion.div>
      </div>

      {/* Info Banner */}
      <GlassCard className="p-4 bg-gradient-to-r from-emerald-500/10 to-purple-500/10 border-emerald-500/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Como funciona:</p>
            <ul className="text-xs text-slate-300 mt-1 space-y-1">
              <li>1. Clique em "Gerar Link de Afiliado" - o link é copiado automaticamente</li>
              <li>2. Envie o link para o novo afiliado</li>
              <li>3. Ele preenche os dados + chave PIX para receber pagamentos</li>
              <li>4. Ao se cadastrar, a aba Afiliados já fica ativada com comissão de 50%</li>
            </ul>
          </div>
        </div>
      </GlassCard>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-4 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{links.length}</p>
              <p className="text-xs text-slate-400">Links Criados</p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {links.reduce((sum, l) => sum + l.total_indicados, 0)}
              </p>
              <p className="text-xs text-slate-400">Total Cadastrados</p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Percent className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{links.filter(l => l.is_active).length}</p>
              <p className="text-xs text-slate-400">Links Ativos</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Affiliate Links Table */}
      <GlassCard className="overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h4 className="text-lg font-semibold text-white">Links Gerados</h4>
        </div>
        
        {links.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Link2 className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum link gerado ainda</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Clique no botão acima para gerar seu primeiro link de afiliado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-slate-400">Código</TableHead>
                  <TableHead className="text-slate-400">Link</TableHead>
                  <TableHead className="text-slate-400 text-center">Comissão</TableHead>
                  <TableHead className="text-slate-400 text-center">Cadastros</TableHead>
                  <TableHead className="text-slate-400 text-center">Status</TableHead>
                  <TableHead className="text-slate-400 text-center">Criado em</TableHead>
                  <TableHead className="text-slate-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {links.map((link) => (
                    <motion.tr
                      key={link.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`border-slate-700/50 ${!link.is_active ? 'opacity-60' : ''}`}
                    >
                      <TableCell>
                        <span className="text-primary font-mono font-bold text-lg">
                          {link.affiliate_code}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 max-w-sm">
                          <Input
                            value={link.affiliate_link}
                            readOnly
                            className="font-mono text-xs bg-slate-800/50 border-slate-700 h-8 text-slate-300"
                          />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={() => copyToClipboard(link.affiliate_link, link.id)}
                                >
                                  {copiedId === link.id ? (
                                    <Check className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-slate-400" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copiar link</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-0 font-bold">
                          50%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-white text-lg">{link.total_indicados}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {link.is_active ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-500/20 text-slate-400 border-0">
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-400">
                        {new Date(link.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => toggleLinkStatus(link.id)}
                                >
                                  {link.is_active ? (
                                    <ToggleRight className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <ToggleLeft className="w-4 h-4 text-slate-400" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{link.is_active ? 'Desativar' : 'Ativar'}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  onClick={() => deleteLink(link.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Excluir</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
