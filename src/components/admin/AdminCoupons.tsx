import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Tag,
  Plus,
  Trash2,
  Loader2,
  Percent,
  DollarSign,
  Calendar,
  Copy,
  Check,
} from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  is_active: boolean;
  usage_limit: number | null;
  times_used: number;
  expires_at: string | null;
  created_at: string;
}

export function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [newCode, setNewCode] = useState("");
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('discount_coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading coupons:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os cupons.",
        variant: "destructive"
      });
    } else {
      setCoupons(data as Coupon[] || []);
    }
    setIsLoading(false);
  };

  const handleAddCoupon = async () => {
    if (!newCode.trim() || !discountValue) {
      toast({
        title: "Erro",
        description: "Preencha o código e o valor do desconto.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('discount_coupons')
      .insert({
        code: newCode.toUpperCase().trim(),
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        usage_limit: usageLimit ? parseInt(usageLimit) : null,
        expires_at: expiresAt || null,
        created_by: user?.id || null,
      });

    if (error) {
      if (error.code === '23505') {
        toast({
          title: "Erro",
          description: "Já existe um cupom com este código.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível criar o cupom.",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Sucesso!",
        description: "Cupom criado com sucesso."
      });
      setShowAddDialog(false);
      resetForm();
      loadCoupons();
    }

    setIsSaving(false);
  };

  const handleToggleCoupon = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('discount_coupons')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o cupom.",
        variant: "destructive"
      });
    } else {
      loadCoupons();
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    const { error } = await supabase
      .from('discount_coupons')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o cupom.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Excluído!",
        description: "Cupom removido com sucesso."
      });
      loadCoupons();
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const resetForm = () => {
    setNewCode("");
    setDiscountType('fixed');
    setDiscountValue("");
    setUsageLimit("");
    setExpiresAt("");
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`;
    }
    return `R$ ${coupon.discount_value.toFixed(2).replace('.', ',')}`;
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-white">
            <Tag className="w-5 h-5 text-purple-400" />
            Cupons de Desconto
          </CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Novo Cupom
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Criar Cupom de Desconto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Código do Cupom</Label>
                  <Input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="PROMO10"
                    className="bg-slate-700 border-slate-600 text-white uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Tipo</Label>
                    <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'fixed' | 'percentage')}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                        <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Valor</Label>
                    <Input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === 'fixed' ? "10.00" : "10"}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Limite de Uso (opcional)</Label>
                    <Input
                      type="number"
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(e.target.value)}
                      placeholder="Ilimitado"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Expira em (opcional)</Label>
                    <Input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAddCoupon}
                  disabled={isSaving}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Criar Cupom
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : coupons.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">
            Nenhum cupom cadastrado ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {coupons.map((coupon) => (
              <motion.div
                key={coupon.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border transition-all ${
                  coupon.is_active
                    ? 'bg-slate-700/50 border-slate-600'
                    : 'bg-slate-800/50 border-slate-700 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      coupon.discount_type === 'percentage'
                        ? 'bg-blue-500/20'
                        : 'bg-emerald-500/20'
                    }`}>
                      {coupon.discount_type === 'percentage' ? (
                        <Percent className="w-5 h-5 text-blue-400" />
                      ) : (
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono font-bold">{coupon.code}</span>
                        <button
                          onClick={() => copyCode(coupon.code)}
                          className="text-slate-400 hover:text-white"
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="text-purple-400 font-semibold">
                          {formatDiscount(coupon)}
                        </span>
                        <span>•</span>
                        <span>
                          {coupon.usage_limit
                            ? `${coupon.times_used}/${coupon.usage_limit} usos`
                            : `${coupon.times_used} usos`}
                        </span>
                        {coupon.expires_at && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(coupon.expires_at).toLocaleDateString('pt-BR')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={coupon.is_active}
                      onCheckedChange={() => handleToggleCoupon(coupon.id, coupon.is_active)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCoupon(coupon.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
