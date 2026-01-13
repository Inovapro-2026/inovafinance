import { useState, useEffect } from "react";
import {
    Users,
    CheckCircle,
    XCircle,
    Search,
    Loader2,
    User,
    ArrowUpRight,
    History,
    Link2
} from "lucide-react";
import { affiliateService } from "@/services/affiliateService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminAffiliateLinkGenerator } from "./AdminAffiliateLinkGenerator";

export function AdminAffiliates() {
    const { user, refreshUser } = useAuth();
    const [invites, setInvites] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadInvites();
    }, []);

    const loadInvites = async () => {
        try {
            setIsLoading(true);
            const data = await affiliateService.getAllPendingInvites();
            setInvites(data || []);
        } catch (error: any) {
            console.error("Error loading pending invites:", error);
            const errorMsg = error.message || error.details || "Erro ao carregar indicações";
            toast.error(`Erro: ${errorMsg}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (inviteId: string, action: 'approve' | 'reject') => {
        try {
            setIsActionLoading(inviteId);
            if (!user) throw new Error("Usuário não autenticado");
            const adminId = String(user.userId); // Convert to string for the service

            if (action === 'approve') {
                await affiliateService.approveInvite(inviteId, adminId);
                toast.success("Indicação aprovada e comissão liberada!");
            } else {
                await affiliateService.rejectInvite(inviteId, adminId);
                toast.success("Indicação rejeitada.");
            }

            setInvites(prev => prev.filter(i => i.id !== inviteId));
        } catch (error) {
            console.error(`Error ${action}ing invite:`, error);
            toast.error(`Erro ao processar ação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        } finally {
            setIsActionLoading(null);
        }
    };

    const filteredInvites = invites.filter(invite =>
        invite.invited_user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invite.inviter_user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invite.invited_matricula?.toString().includes(searchTerm) ||
        invite.inviter_matricula?.toString().includes(searchTerm)
    );

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Carregando indicações...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Users className="text-primary" />
                        Gerenciamento de Afiliados
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Gerencie links, aprove indicações e controle comissões.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="links" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="links" className="flex items-center gap-2">
                        <Link2 className="w-4 h-4" />
                        Gerar Links
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Indicações Pendentes
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="links">
                    <AdminAffiliateLinkGenerator />
                </TabsContent>

                <TabsContent value="pending">
                    <div className="space-y-4">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome ou matrícula..."
                                className="pl-9 h-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-4">
                            <AnimatePresence mode="popLayout">
                    {filteredInvites.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed"
                        >
                            <Users className="w-12 h-12 text-muted/30 mx-auto mb-4" />
                            <p className="text-muted-foreground">Nenhuma indicação pendente encontrada.</p>
                        </motion.div>
                    ) : (
                        filteredInvites.map((invite) => (
                            <motion.div
                                key={invite.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <GlassCard className="p-5 overflow-hidden group">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                                            {/* Inviter Info */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-primary uppercase tracking-wider">Quem Indicou</label>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                        {invite.inviter_user?.full_name?.charAt(0) || "U"}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm">{invite.inviter_user?.full_name}</p>
                                                        <p className="text-xs text-muted-foreground">Matrícula: {invite.inviter_matricula}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Invited Info */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">Quem foi Indicado</label>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold">
                                                        {invite.invited_user?.full_name?.charAt(0) || "U"}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm">{invite.invited_user?.full_name}</p>
                                                        <p className="text-xs text-muted-foreground">Matrícula: {invite.invited_matricula}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 border-t md:border-t-0 pt-4 md:pt-0">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-rose-500/50 text-rose-500 hover:bg-rose-500/10 h-9 px-4"
                                                onClick={() => handleAction(invite.id, 'reject')}
                                                disabled={isActionLoading === invite.id}
                                            >
                                                <XCircle className="w-4 h-4 mr-2" />
                                                Rejeitar
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="bg-emerald-600 hover:bg-emerald-700 h-9 px-4"
                                                onClick={() => handleAction(invite.id, 'approve')}
                                                disabled={isActionLoading === invite.id}
                                            >
                                                {isActionLoading === invite.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                )}
                                                Aprovar & Liberar
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t flex items-center justify-between text-[10px] text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <History size={12} />
                                            Enviado em: {new Date(invite.created_at).toLocaleString()}
                                        </div>
                                        <div className="font-bold text-emerald-500">
                                            Comissão: R$ 10,00
                                        </div>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))
                    )}
                            </AnimatePresence>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
