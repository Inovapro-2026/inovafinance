import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  fullName: string;
  email: string;
  phone: string;
  cpf: string;
  hasCreditCard: boolean;
  creditLimit?: number;
  creditDueDay?: number;
  salaryAmount?: number;
  salaryDay?: number;
  advanceAmount?: number;
  advanceDay?: number;
  affiliateCode?: number;
  couponCode?: string;
  // Flag to activate affiliate mode for new user (from admin-generated link)
  activateAffiliateMode?: boolean;
  adminAffiliateLinkCode?: string;
  // PIX key for affiliate payouts
  pixKey?: string;
  pixKeyType?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!MP_ACCESS_TOKEN) {
      throw new Error('Mercado Pago Access Token not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: PaymentRequest = await req.json();
    
    // Validate required fields
    if (!body.fullName || !body.phone || !body.cpf) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: nome, telefone e CPF' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate affiliate code if provided
    let validAffiliateCode: number | null = null;
    if (body.affiliateCode) {
      const { data: affiliate } = await supabase
        .from('users_matricula')
        .select('matricula, user_status')
        .eq('matricula', body.affiliateCode)
        .eq('user_status', 'approved')
        .single();
      
      if (affiliate) {
        validAffiliateCode = affiliate.matricula;
      }
    }

    // Fetch prices from system_settings
    const { data: priceSettings } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['subscription_price', 'affiliate_price']);

    let defaultPrice = 49.99;
    let affiliatePrice = 29.99;

    priceSettings?.forEach((s: { key: string; value: string | null }) => {
      if (s.key === 'subscription_price' && s.value) defaultPrice = parseFloat(s.value);
      if (s.key === 'affiliate_price' && s.value) affiliatePrice = parseFloat(s.value);
    });

    // Validate and apply coupon if provided
    let couponDiscount = 0;
    let appliedCoupon: string | null = null;

    if (body.couponCode) {
      const { data: coupon } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('code', body.couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (coupon) {
        // Check if coupon is expired
        const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
        // Check usage limit
        const usageLimitReached = coupon.usage_limit && coupon.times_used >= coupon.usage_limit;

        if (!isExpired && !usageLimitReached) {
          appliedCoupon = coupon.code;
          if (coupon.discount_type === 'percentage') {
            couponDiscount = (defaultPrice * coupon.discount_value) / 100;
          } else {
            couponDiscount = coupon.discount_value;
          }

          // Increment coupon usage
          await supabase
            .from('discount_coupons')
            .update({ times_used: coupon.times_used + 1 })
            .eq('id', coupon.id);
        }
      }
    }

    // Calculate final amount
    let basePrice = validAffiliateCode ? affiliatePrice : defaultPrice;
    let amount = Math.max(0.01, basePrice - couponDiscount); // Minimum R$ 0.01

    // Generate unique temp ID for this payment
    const userTempId = crypto.randomUUID();

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_temp_id: userTempId,
        full_name: body.fullName,
        email: body.email || null,
        phone: body.phone,
        cpf: body.cpf,
        amount: amount,
        payment_status: 'pending',
        affiliate_code: validAffiliateCode,
        has_credit_card: body.hasCreditCard || false,
        credit_limit: body.creditLimit || 0,
        credit_due_day: body.creditDueDay || 5,
        salary_amount: body.salaryAmount || 0,
        salary_day: body.salaryDay || 5,
        advance_amount: body.advanceAmount || 0,
        advance_day: body.advanceDay || null,
        // Flag to activate affiliate mode for new user
        activate_affiliate_mode: body.activateAffiliateMode || false,
        admin_affiliate_link_code: body.adminAffiliateLinkCode || null,
        // PIX key for affiliate payouts
        pix_key: body.pixKey || null,
        pix_key_type: body.pixKeyType || null,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      throw new Error('Erro ao criar registro de pagamento');
    }

    // Clean CPF - remove formatting
    const cleanCpf = body.cpf.replace(/\D/g, '');

    // Check if using test credentials (starts with TEST-)
    const isTestMode = MP_ACCESS_TOKEN.startsWith('TEST-');

    const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

    // Mercado Pago sandbox requires a valid (often test-user) payer email.
    // We'll create a test user dynamically when using TEST- credentials.
    let payerEmail = (body.email || '').trim();

    if (isTestMode) {
      const createTestUserRes = await fetch('https://api.mercadopago.com/users/test_user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ site_id: 'MLB' }),
      });

      const testUser = await createTestUserRes.json();

      if (!createTestUserRes.ok || !testUser?.email || !isValidEmail(String(testUser.email))) {
        console.error('Mercado Pago test_user error:', JSON.stringify(testUser));
        throw new Error('Não foi possível criar usuário de teste no Mercado Pago');
      }

      payerEmail = String(testUser.email);
    } else if (!isValidEmail(payerEmail)) {
      // Fallback for prod: generate a safe, valid email if user didn't provide one
      payerEmail = `${cleanCpf}@inovabank.com`;
    }

    // Create PIX payment in Mercado Pago
    const pixPaymentData = {
      transaction_amount: amount,
      description: validAffiliateCode 
        ? `Assinatura INOVABANK - Indicação #${validAffiliateCode}` 
        : 'Assinatura INOVABANK - Plano Premium',
      payment_method_id: 'pix',
      payer: {
        email: payerEmail,
        first_name: body.fullName.split(' ')[0],
        last_name: body.fullName.split(' ').slice(1).join(' ') || 'Cliente',
        identification: {
          type: 'CPF',
          number: cleanCpf,
        },
      },
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
      external_reference: userTempId,
    };

    console.log('Creating PIX payment:', { userTempId, amount, isTestMode });

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': userTempId,
      },
      body: JSON.stringify(pixPaymentData),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Mercado Pago API error:', JSON.stringify(mpData, null, 2));
      throw new Error(mpData.message || 'Erro ao criar pagamento PIX no Mercado Pago');
    }

    console.log('PIX payment created:', mpData.id);

    // Update payment record with MP payment ID
    await supabase
      .from('payments')
      .update({ mp_payment_id: String(mpData.id) })
      .eq('id', payment.id);

    // Extract PIX data from response
    const pixData = mpData.point_of_interaction?.transaction_data;

    return new Response(
      JSON.stringify({
        paymentId: mpData.id,
        status: mpData.status,
        statusDetail: mpData.status_detail,
        amount: amount,
        userTempId: userTempId,
        isAffiliate: !!validAffiliateCode,
        pix: {
          qrCode: pixData?.qr_code || null,
          qrCodeBase64: pixData?.qr_code_base64 || null,
          ticketUrl: pixData?.ticket_url || null,
          expirationDate: mpData.date_of_expiration || null,
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Error in create-pix-payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
