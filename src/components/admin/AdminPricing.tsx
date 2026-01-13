import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Save, Loader2 } from "lucide-react";

export function AdminPricing() {
  const [subscriptionPrice, setSubscriptionPrice] = useState("");
  const [affiliatePrice, setAffiliatePrice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['subscription_price', 'affiliate_price']);

    if (error) {
      console.error('Error loading prices:', error);
    } else {
      data?.forEach((setting) => {
        if (setting.key === 'subscription_price') {
          setSubscriptionPrice(setting.value || '49.99');
        } else if (setting.key === 'affiliate_price') {
          setAffiliatePrice(setting.value || '29.99');
        }
      });
    }
    
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Update subscription price
      await supabase
        .from('system_settings')
        .upsert({ key: 'subscription_price', value: subscriptionPrice }, { onConflict: 'key' });

      // Update affiliate price
      await supabase
        .from('system_settings')
        .upsert({ key: 'affiliate_price', value: affiliatePrice }, { onConflict: 'key' });

      toast({
        title: "Preços atualizados!",
        description: "Os novos valores já estão em vigor."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os preços.",
        variant: "destructive"
      });
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-white">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          Preços de Assinatura
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-700/50 rounded-lg space-y-3">
            <Label className="text-slate-300">Preço Padrão</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
              <Input
                type="number"
                step="0.01"
                value={subscriptionPrice}
                onChange={(e) => setSubscriptionPrice(e.target.value)}
                className="bg-slate-600 border-slate-500 text-white pl-10 text-lg"
              />
            </div>
            <p className="text-xs text-slate-400">
              Valor cobrado de assinantes diretos
            </p>
          </div>

          <div className="p-4 bg-slate-700/50 rounded-lg space-y-3">
            <Label className="text-slate-300">Preço com Indicação</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
              <Input
                type="number"
                step="0.01"
                value={affiliatePrice}
                onChange={(e) => setAffiliatePrice(e.target.value)}
                className="bg-slate-600 border-slate-500 text-white pl-10 text-lg"
              />
            </div>
            <p className="text-xs text-slate-400">
              Valor para indicados por afiliados
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Alterações
        </Button>

        <p className="text-xs text-slate-500 text-center">
          ⚠️ Alterações afetam apenas novos pagamentos
        </p>
      </CardContent>
    </Card>
  );
}
