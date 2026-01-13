import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    UserPlus,
    Clock,
    CheckCircle2,
    XCircle,
    DollarSign,
    Share2,
    Copy,
    ChevronRight,
    Sparkles,
    Search,
    ArrowRight,
    Wallet
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { affiliateService, AffiliateStats } from "@/services/affiliateService";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AffiliateWallet } from "@/components/AffiliateWallet";

const statusConfig = {
    pending: { label: "Pendente", icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
    review: { label: "Em análise", icon: Search, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
    approved: { label: "Aprovado", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
    rejected: { label: "Rejeitado", icon: XCircle, color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20" },
};

export default function Affiliates() {
    const { user } = useAuth();
    const [stats, setStats] = useState<AffiliateStats | null>(null);
    const [invites, setInvites] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user?.userId) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [statsData, invitesData] = await Promise.all([
                affiliateService.getAffiliateStats(user!.userId),
                affiliateService.getInvitesList(user!.userId)
            ]);
            setStats(statsData);
            setInvites(invitesData);
        } catch (error) {
            console.error("Error loading affiliate data:", error);
            toast.error("Erro ao carregar dados de afiliados");
        } finally {
            setIsLoading(false);
        }
    };

    const copyCode = () => {
        if (user?.userId) {
            navigator.clipboard.writeText(user.userId.toString());
            toast.success("Código de indicação copiado!");
        }
    };

    const shareInvite = () => {
        const text = `Vem pro INOVAFINANCE! Use meu código ${user?.userId} ao se cadastrar e ganhe benefícios exclusivos.`;
        if (navigator.share) {
            navigator.share({
                title: 'INOVAFINANCE',
                text: text,
                url: window.location.origin
            });
        } else {
            copyCode();
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-32 pt-12 px-6 overflow-x-hidden">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold font-display gradient-text flex items-center gap-3">
                    <Users className="w-8 h-8 text-primary" />
                    Indique e Ganhe
                </h1>
                <p className="text-muted-foreground mt-2">
                    Convide amigos e receba comissões reais por cada cadastro aprovado.
                </p>
            </motion.div>

            {/* Highlight Banner */}
            <GlassCard className="p-4 mb-6 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">💰 Comissão liberada automaticamente</p>
                        <p className="text-xs text-muted-foreground">Ganhe 50% do valor de cada assinatura confirmada!</p>
                    </div>
                </div>
            </GlassCard>

            {/* Referral Code Section */}
            <GlassCard className="p-6 mb-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sparkles className="w-16 h-16 text-primary" />
                </div>
                <div className="relative z-10">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                        Seu código de indicação
                    </label>
                    <div className="flex items-center gap-4 mt-2">
                        <div className="flex-1 bg-muted/30 border border-border rounded-xl px-4 py-3 text-2xl font-bold tracking-widest flex items-center justify-between">
                            {user?.userId}
                            <button onClick={copyCode} className="text-primary hover:text-primary/80 transition-colors">
                                <Copy size={20} />
                            </button>
                        </div>
                        <Button size="icon" className="h-14 w-14 rounded-xl" onClick={shareInvite}>
                            <Share2 size={24} />
                        </Button>
                    </div>
                </div>
            </GlassCard>

            {/* Referral Link Section - NEW */}
            <GlassCard className="p-6 mb-8 relative overflow-hidden">
                <div className="relative z-10">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                        Seu link exclusivo de indicação
                    </label>
                    <div className="mt-2 bg-muted/30 border border-border rounded-xl px-4 py-3">
                        <p className="text-sm font-mono text-primary break-all">
                            {window.location.origin}/subscribe?ref={user?.userId}
                        </p>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <Button 
                            variant="outline" 
                            className="flex-1" 
                            onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/subscribe?ref=${user?.userId}`);
                                toast.success("Link copiado!");
                            }}
                        >
                            <Copy size={16} className="mr-2" />
                            Copiar Link
                        </Button>
                        <Button 
                            className="flex-1 bg-green-600 hover:bg-green-700" 
                            onClick={() => {
                                const url = `${window.location.origin}/subscribe?ref=${user?.userId}`;
                                const text = `Vem pro INOVAFINANCE! Acesse meu link exclusivo e ganhe desconto na assinatura: ${url}`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                        >
                            <Share2 size={16} className="mr-2" />
                            WhatsApp
                        </Button>
                    </div>
                </div>
            </GlassCard>

            {/* Wallet Section */}
            <GlassCard className="p-6 mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <Wallet className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold">Carteira</h2>
                </div>
                <AffiliateWallet 
                    userId={user?.userId || 0} 
                    affiliateBalance={stats?.totalCommissions || 0}
                    onBalanceUpdate={loadData}
                />
            </GlassCard>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <GlassCard className="p-5">
                    <Users className="w-5 h-5 text-blue-400 mb-3" />
                    <p className="text-2xl font-bold">{stats?.totalInvites || 0}</p>
                    <p className="text-xs text-muted-foreground">Total de Convites</p>
                </GlassCard>
                <GlassCard className="p-5">
                    <DollarSign className="w-5 h-5 text-emerald-400 mb-3" />
                    <p className="text-2xl font-bold">R$ {stats?.totalCommissions.toFixed(2) || "0.00"}</p>
                    <p className="text-xs text-muted-foreground">Comissão Total</p>
                </GlassCard>
            </div>

            {/* Status Breakdown */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
                <StatusBadge
                    icon={statusConfig.pending.icon}
                    label="Pendentes"
                    value={stats?.pendingReviews || 0}
                    color="amber"
                />
                <StatusBadge
                    icon={statusConfig.approved.icon}
                    label="Aprovados"
                    value={stats?.approvedCount || 0}
                    color="emerald"
                />
                <StatusBadge
                    icon={statusConfig.rejected.icon}
                    label="Rejeitados"
                    value={stats?.rejectedCount || 0}
                    color="rose"
                />
            </div>

            {/* Invites List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Histórico de Convites</h2>
                    <span className="text-xs text-muted-foreground">{invites.length} convidados</span>
                </div>

                {invites.length === 0 ? (
                    <GlassCard className="p-12 text-center">
                        <UserPlus className="w-12 h-12 text-muted/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">Nenhuma indicação ainda.</p>
                        <Button variant="link" onClick={shareInvite} className="mt-2 text-primary">
                            Começar a convidar <ArrowRight size={16} className="ml-1" />
                        </Button>
                    </GlassCard>
                ) : (
                    invites.map((invite) => {
                        const config = statusConfig[invite.status as keyof typeof statusConfig];
                        return (
                            <motion.div
                                key={invite.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                            >
                                <GlassCard className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.bg, config.color)}>
                                            <config.icon size={20} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">{invite.invited_user?.full_name || "Convidado"}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                Matrícula: {invite.invited_user?.matricula} • {new Date(invite.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={cn("px-2 py-1 rounded-full text-[10px] font-bold border", config.bg, config.color, config.border)}>
                                        {config.label.toUpperCase()}
                                    </div>
                                </GlassCard>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function StatusBadge({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: 'amber' | 'emerald' | 'rose' }) {
    const colors = {
        amber: "text-amber-400 border-amber-400/20 bg-amber-400/5",
        emerald: "text-emerald-400 border-emerald-400/20 bg-emerald-400/5",
        rose: "text-rose-400 border-rose-400/20 bg-rose-400/5",
    };

    return (
        <div className={cn("flex-shrink-0 px-4 py-2 rounded-xl border flex items-center gap-2", colors[color])}>
            <Icon size={14} />
            <span className="text-xs font-semibold">{value} {label}</span>
        </div>
    );
}
