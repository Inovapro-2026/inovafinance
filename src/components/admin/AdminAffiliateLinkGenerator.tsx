import { useState, useEffect } from "react";
import { Link2, Copy, Check, Plus, Trash2, Users, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface AffiliateLink {
  id: string;
  affiliate_code: string;
  affiliate_link: string;
  commission_percent: number;
  is_active: boolean;
  created_at: string;
  times_used: number;
}

export function AdminAffiliateLinkGenerator() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [commissionPercent, setCommissionPercent] = useState("50");

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
        setLinks(parsedLinks);
      }
    } catch (error) {
      console.error('Error loading affiliate links:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveLinks = async (newLinks: AffiliateLink[]) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'affiliate_links',
          value: JSON.stringify(newLinks),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      setLinks(newLinks);
    } catch (error) {
      console.error('Error saving affiliate links:', error);
      throw error;
    }
  };

  const generateLink = async () => {
    setIsGenerating(true);
    try {
      // Generate unique code
      const code = `AFI-${Math.random().toString(36).substring(2, 7).toUpperCase()}${Date.now().toString(36).substring(-3).toUpperCase()}`;
      
      const newLink: AffiliateLink = {
        id: crypto.randomUUID(),
        affiliate_code: code,
        affiliate_link: `${baseUrl}/subscribe?ref=${code}`,
        commission_percent: parseInt(commissionPercent) || 50,
        is_active: true,
        created_at: new Date().toISOString(),
        times_used: 0
      };

      await saveLinks([...links, newLink]);
      toast.success("Link de afiliado gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar link de afiliado");
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

  const copyToClipboard = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success("Link copiado com sucesso!");
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Gerar Link de Afiliado
          </h3>
          <p className="text-sm text-muted-foreground">
            Crie links exclusivos para novos afiliados entrarem no sistema.
          </p>
        </div>
      </div>

      {/* Generator Card */}
      <GlassCard className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <Label className="text-sm font-semibold">Comissão (%)</Label>
            <Input
              type="number"
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(e.target.value)}
              placeholder="50"
              className="h-11"
              min="1"
              max="100"
            />
          </div>
          <Button
            onClick={generateLink}
            disabled={isGenerating}
            className="h-11 px-6 bg-primary hover:bg-primary/90"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Gerar Novo Link
          </Button>
        </div>
      </GlassCard>

      {/* Links List */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Links Gerados ({links.length})
        </h4>

        <AnimatePresence mode="popLayout">
          {links.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed"
            >
              <Link2 className="w-12 h-12 text-muted/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum link gerado ainda.</p>
              <p className="text-sm text-muted-foreground/70">Clique em "Gerar Novo Link" para criar.</p>
            </motion.div>
          ) : (
            links.map((link) => (
              <motion.div
                key={link.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <GlassCard className={`p-5 ${!link.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          link.is_active 
                            ? 'bg-emerald-500/20 text-emerald-500' 
                            : 'bg-rose-500/20 text-rose-500'
                        }`}>
                          {link.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Código: <span className="font-mono font-bold text-primary">{link.affiliate_code}</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Input
                          value={link.affiliate_link}
                          readOnly
                          className="font-mono text-sm bg-muted/50 h-10"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          onClick={() => copyToClipboard(link.affiliate_link, link.id)}
                        >
                          {copiedId === link.id ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Comissão: <strong className="text-primary">{link.commission_percent}%</strong></span>
                        <span>Usos: <strong>{link.times_used}</strong></span>
                        <span>Criado: {new Date(link.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleLinkStatus(link.id)}
                        className="h-9"
                      >
                        {link.is_active ? (
                          <><ToggleRight className="w-4 h-4 mr-1" /> Desativar</>
                        ) : (
                          <><ToggleLeft className="w-4 h-4 mr-1" /> Ativar</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 text-rose-500 hover:bg-rose-500/10"
                        onClick={() => deleteLink(link.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
