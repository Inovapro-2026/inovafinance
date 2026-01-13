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

    // Determine subscription amount
    // R$ 29.99 if coming from affiliate, otherwise default price
    const DEFAULT_PRICE = 49.99;
    const AFFILIATE_PRICE = 29.99;
    const amount = validAffiliateCode ? AFFILIATE_PRICE : DEFAULT_PRICE;

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
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      throw new Error('Erro ao criar registro de pagamento');
    }

    // Get the base URL for callbacks
    const origin = req.headers.get('origin') || 'https://lovable.dev';

    // Create Mercado Pago preference
    const preferenceData = {
      items: [
        {
          id: userTempId,
          title: 'Assinatura INOVABANK',
          description: validAffiliateCode 
            ? `Assinatura INOVABANK - Indicação #${validAffiliateCode}` 
            : 'Assinatura INOVABANK - Plano Premium',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: amount,
        },
      ],
      payer: {
        name: body.fullName,
        email: body.email || 'cliente@inovabank.com',
        phone: {
          number: body.phone.replace(/\D/g, ''),
        },
        identification: {
          type: 'CPF',
          number: body.cpf.replace(/\D/g, ''),
        },
      },
      back_urls: {
        success: `${origin}/payment-callback?status=success&temp_id=${userTempId}`,
        failure: `${origin}/payment-callback?status=failure&temp_id=${userTempId}`,
        pending: `${origin}/payment-callback?status=pending&temp_id=${userTempId}`,
      },
      auto_return: 'approved',
      external_reference: userTempId,
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
      statement_descriptor: 'INOVABANK',
    };

    console.log('Creating MP preference with data:', JSON.stringify(preferenceData, null, 2));

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceData),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('Mercado Pago API error:', errorText);
      throw new Error('Erro ao criar preferência no Mercado Pago');
    }

    const mpData = await mpResponse.json();
    console.log('MP preference created:', mpData.id);

    // Update payment record with preference ID
    await supabase
      .from('payments')
      .update({ mp_preference_id: mpData.id })
      .eq('id', payment.id);

    return new Response(
      JSON.stringify({
        preferenceId: mpData.id,
        initPoint: mpData.init_point,
        sandboxInitPoint: mpData.sandbox_init_point,
        amount: amount,
        userTempId: userTempId,
        isAffiliate: !!validAffiliateCode,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Error in create-mp-preference:', error);
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
