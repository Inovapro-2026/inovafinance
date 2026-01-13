import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, User, Mail, Phone, FileText, Wallet, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type PixKeyType = "cpf" | "email" | "phone" | "random";

interface AffiliateLinkRecord {
  affiliate_code: string;
  affiliate_name?: string;
  is_active: boolean;
  is_blocked?: boolean;
}

export default function AffiliateSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [isValidatingLink, setIsValidatingLink] = useState(true);
  const [isValidLink, setIsValidLink] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>("parceiro INOVAFINANCE");

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");

  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("cpf");

  const headerSubtitle = useMemo(() => {
    if (isValidatingLink) return "Validando convite...";
    if (!isValidLink) return "Convite inválido ou expirado";
    return `Indicado por ${partnerName}`;
  }, [isValidatingLink, isValidLink, partnerName]);

  useEffect(() => {
    const rawCode =
      searchParams.get("ref") ||
      searchParams.get("affiliate") ||
      searchParams.get("code") ||
      searchParams.get("invite") ||
      searchParams.get("inv");

    const code = rawCode ? decodeURIComponent(rawCode).trim() : null;
    setInviteCode(code);

    const validate = async () => {
      setIsValidatingLink(true);
      setIsValidLink(false);
      setError("");

      try {
        if (!code || !(code.startsWith("INV-") || code.startsWith("AFI-"))) {
          setError("Link de afiliado inválido.");
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "affiliate_links")
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data?.value) {
          setError("Nenhum link de afiliado configurado ainda.");
          return;
        }

        // Handle both string and already-parsed object
        let links: AffiliateLinkRecord[] = [];
        try {
          links = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        } catch {
          console.error("Failed to parse affiliate links:", data.value);
          setError("Erro ao processar links de afiliado.");
          return;
        }

        const link = links.find(
          (l) => l.affiliate_code === code && l.is_active && !l.is_blocked
        );

        if (!link) {
          setError("Este convite não existe, está inativo ou foi bloqueado.");
          return;
        }

        setPartnerName(link.affiliate_name || "parceiro INOVAFINANCE");
        setIsValidLink(true);
      } catch (e: any) {
        console.error("Error validating affiliate invite:", e);
        setError(e?.message || "Erro ao validar convite");
      } finally {
        setIsValidatingLink(false);
      }
    };

    validate();
  }, [searchParams]);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return value;
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return value;
  };

  const generateMatricula = async (): Promise<number> => {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const newMatricula = Math.floor(100000 + Math.random() * 900000);

      const { data } = await supabase
        .from("users_matricula")
        .select("matricula")
        .eq("matricula", newMatricula)
        .maybeSingle();

      if (!data) return newMatricula;
      attempts++;
    }

    throw new Error("Não foi possível gerar matrícula única");
  };

  const handleCreateAffiliate = async () => {
    if (!isValidLink || !inviteCode) {
      setError("Convite inválido.");
      return;
    }

    if (!fullName.trim()) {
      setError("Nome completo é obrigatório");
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setError("Telefone válido é obrigatório");
      return;
    }
    if (!cpf.trim() || cpf.replace(/\D/g, "").length !== 11) {
      setError("CPF válido é obrigatório");
      return;
    }
    if (!pixKey.trim()) {
      setError("Chave PIX é obrigatória para receber comissões");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const newMatricula = await generateMatricula();
      const now = new Date().toISOString();

      const { error: insertError } = await supabase.from("users_matricula").insert({
        matricula: newMatricula,
        full_name: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim(),
        cpf: cpf.replace(/\D/g, ""),
        initial_balance: 0,
        user_status: "approved",
        blocked: false,
        subscription_type: "AFFILIATE_FREE",
        subscription_status: "active",
        subscription_start_date: now,
        subscription_end_date: null,
        is_affiliate: true,
        affiliate_code: newMatricula.toString(),
        affiliate_balance: 0,
        pix_key: pixKey.trim(),
        pix_key_type: pixKeyType,
        is_admin_affiliate: true,
        admin_affiliate_created_at: now,
        last_affiliate_sale_at: null,
        affiliate_deactivated_at: null,
        admin_affiliate_link_code: inviteCode,
      } as any);

      if (insertError) throw insertError;

      // Auto-login and go to the same client dashboard
      const success = await login(newMatricula, fullName.trim(), email.trim(), phone.trim(), 0);
      if (!success) {
        toast({
          title: "Conta criada!",
          description: `Sua matrícula é ${newMatricula}. Faça login para acessar.`,
        });
        navigate("/login");
        return;
      }

      toast({
        title: "Conta de afiliado criada!",
        description: "Bem-vindo! A aba Afiliados já está liberada no seu painel.",
      });
      navigate("/");
    } catch (e: any) {
      console.error("Error creating affiliate:", e);
      setError(e?.message || "Erro ao criar conta de afiliado");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h1 className="font-display text-xl font-bold">Cadastro de Afiliado</h1>
                <p className="text-sm text-muted-foreground mt-1">{headerSubtitle}</p>
              </div>
            </div>

            {!isValidatingLink && !isValidLink && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive">{error || "Convite inválido"}</span>
              </div>
            )}

            {isValidLink && (
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-sm">
                  Conta <span className="font-semibold">GRÁTIS</span> (sem mensalidade). Você recebe comissões via PIX.
                </p>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome completo *
                </Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="bg-background/50"
                  disabled={!isValidLink || isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  E-mail (opcional)
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-background/50"
                  disabled={!isValidLink || isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefone *
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="bg-background/50"
                  disabled={!isValidLink || isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  CPF *
                </Label>
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className="bg-background/50"
                  disabled={!isValidLink || isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Chave PIX *
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Digite sua chave"
                    className="bg-background/50 col-span-2"
                    disabled={!isValidLink || isLoading}
                  />
                  <Button
                    type="button"
                    variant={pixKeyType === "cpf" ? "default" : "outline"}
                    onClick={() => setPixKeyType("cpf")}
                    disabled={!isValidLink || isLoading}
                  >
                    CPF
                  </Button>
                  <Button
                    type="button"
                    variant={pixKeyType === "phone" ? "default" : "outline"}
                    onClick={() => setPixKeyType("phone")}
                    disabled={!isValidLink || isLoading}
                  >
                    Telefone
                  </Button>
                  <Button
                    type="button"
                    variant={pixKeyType === "email" ? "default" : "outline"}
                    onClick={() => setPixKeyType("email")}
                    disabled={!isValidLink || isLoading}
                  >
                    E-mail
                  </Button>
                  <Button
                    type="button"
                    variant={pixKeyType === "random" ? "default" : "outline"}
                    onClick={() => setPixKeyType("random")}
                    disabled={!isValidLink || isLoading}
                  >
                    Aleatória
                  </Button>
                </div>
              </div>

              {error && isValidLink && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-destructive">{error}</span>
                </div>
              )}

              <Button
                onClick={handleCreateAffiliate}
                disabled={!isValidLink || isLoading}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90 transition-opacity"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Criar conta e entrar
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <button onClick={() => navigate("/login")} className="text-primary hover:underline">
                  Fazer login
                </button>
              </p>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
