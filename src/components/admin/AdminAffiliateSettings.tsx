import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Save, Loader2, Percent, DollarSign, Wallet } from "lucide-react";

interface AffiliateSettings {
  commissionType: 'percentage' | 'fixed';
  commissionValue: string;
  minWithdrawal: string;
}

export function AdminAffiliateSettings() {
  const [settings, setSettings] = useState<AffiliateSettings>({
    commissionType: 'percentage',
    commissionValue: '30',
    minWithdrawal: '40',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['affiliate_commission_type', 'affiliate_commission_value', 'affiliate_min_withdrawal']);

    if (error) {
      console.error('Error loading affiliate settings:', error);
    } else {
      const newSettings: AffiliateSettings = { ...settings };
      data?.forEach((setting) => {
        if (setting.key === 'affiliate_commission_type') {
          newSettings.commissionType = (setting.value as 'percentage' | 'fixed') || 'percentage';
        } else if (setting.key === 'affiliate_commission_value') {
          newSettings.commissionValue = setting.value || '30';
        } else if (setting.key === 'affiliate_min_withdrawal') {
          newSettings.minWithdrawal = setting.value || '40';
        }
      });
      setSettings(newSettings);
    }
    
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await supabase
        .from('system_settings')
        .upsert({ key: 'affiliate_commission_type', value: settings.commissionType }, { onConflict: 'key' });

      await supabase
        .from('system_settings')
        .upsert({ key: 'affiliate_commission_value', value: settings.commissionValue }, { onConflict: 'key' });

      await supabase
        .from('system_settings')
        .upsert({ key: 'affiliate_min_withdrawal', value: settings.minWithdrawal }, { onConflict: 'key' });

      toast({
        title: "Configurações salvas!",
        description: "As configurações de afiliados foram atualizadas."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    }

    setIsSaving(false);
  };

  // Calculate example commission
  const examplePrice = 49.99;
  const commissionExample = settings.commissionType === 'percentage'
    ? (examplePrice * parseFloat(settings.commissionValue || '0') / 100).toFixed(2)
    : parseFloat(settings.commissionValue || '0').toFixed(2);

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
          <Users className="w-5 h-5 text-purple-400" />
          Configurações de Afiliados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Commission Type */}
        <div className="p-4 bg-slate-700/50 rounded-lg space-y-4">
          <Label className="text-slate-300 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Tipo de Comissão
          </Label>
          <Select
            value={settings.commissionType}
            onValueChange={(value: 'percentage' | 'fixed') => 
              setSettings({ ...settings, commissionType: value })
            }
          >
            <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="percentage" className="text-slate-300">
                <span className="flex items-center gap-2">
                  <Percent className="w-4 h-4" /> Percentual (%)
                </span>
              </SelectItem>
              <SelectItem value="fixed" className="text-slate-300">
                <span className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Valor Fixo (R$)
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Commission Value */}
          <div className="p-4 bg-slate-700/50 rounded-lg space-y-3">
            <Label className="text-slate-300">
              {settings.commissionType === 'percentage' ? 'Percentual da Comissão (%)' : 'Valor Fixo (R$)'}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                {settings.commissionType === 'percentage' ? '%' : 'R$'}
              </span>
              <Input
                type="number"
                step={settings.commissionType === 'percentage' ? '1' : '0.01'}
                value={settings.commissionValue}
                onChange={(e) => setSettings({ ...settings, commissionValue: e.target.value })}
                className="bg-slate-600 border-slate-500 text-white pl-10 text-lg"
              />
            </div>
            <p className="text-xs text-slate-400">
              Exemplo: <span className="text-emerald-400">R$ {commissionExample}</span> por indicação
            </p>
          </div>

          {/* Minimum Withdrawal */}
          <div className="p-4 bg-slate-700/50 rounded-lg space-y-3">
            <Label className="text-slate-300 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-400" />
              Valor Mínimo para Saque
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
              <Input
                type="number"
                step="0.01"
                value={settings.minWithdrawal}
                onChange={(e) => setSettings({ ...settings, minWithdrawal: e.target.value })}
                className="bg-slate-600 border-slate-500 text-white pl-10 text-lg"
              />
            </div>
            <p className="text-xs text-slate-400">
              Afiliado precisa ter no mínimo este valor para solicitar saque
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Configurações de Afiliados
        </Button>
      </CardContent>
    </Card>
  );
}
