import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get webhook data
    const url = new URL(req.url);
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const id = url.searchParams.get('id') || url.searchParams.get('data.id');

    // Also try to get from body for newer webhook format
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body might be empty for some webhook types
    }

    const paymentId = id || body?.data?.id;
    const notificationType = topic || body?.type;

    console.log('Webhook received:', { notificationType, paymentId, body });

    // Only process payment notifications
    if (notificationType !== 'payment' && notificationType !== 'payment.updated') {
      return new Response(
        JSON.stringify({ message: 'Notification type ignored' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: 'Payment ID not provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment details from Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('Error fetching payment from MP:', errorText);
      throw new Error('Error fetching payment details');
    }

    const mpPayment = await mpResponse.json();
    console.log('Payment details from MP:', {
      id: mpPayment.id,
      status: mpPayment.status,
      external_reference: mpPayment.external_reference,
    });

    const userTempId = mpPayment.external_reference;
    const paymentStatus = mpPayment.status;

    // Find the payment record
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('user_temp_id', userTempId)
      .single();

    if (findError || !payment) {
      console.error('Payment record not found:', findError);
      return new Response(
        JSON.stringify({ error: 'Payment record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payment status
    await supabase
      .from('payments')
      .update({
        payment_status: paymentStatus,
        mp_payment_id: paymentId.toString(),
      })
      .eq('id', payment.id);

    // If payment is approved, create user account
    if (paymentStatus === 'approved' && !payment.matricula) {
      // Generate unique matricula
      let matricula: number;
      let isUnique = false;
      
      do {
        matricula = Math.floor(100000 + Math.random() * 900000);
        const { data: existing } = await supabase
          .from('users_matricula')
          .select('matricula')
          .eq('matricula', matricula)
          .single();
        
        isUnique = !existing;
      } while (!isUnique);

      // Create user in users_matricula - AUTO APPROVED
      // Check if should activate affiliate mode (from admin-generated link)
      const activateAffiliate = payment.activate_affiliate_mode === true;
      
      // Set subscription dates (30 days from now)
      const now = new Date();
      const subscriptionStartDate = now.toISOString();
      const subscriptionEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { error: userError } = await supabase
        .from('users_matricula')
        .insert({
          matricula: matricula,
          full_name: payment.full_name,
          email: payment.email,
          phone: payment.phone,
          cpf: payment.cpf,
          has_credit_card: payment.has_credit_card,
          credit_limit: payment.credit_limit,
          credit_due_day: payment.credit_due_day,
          salary_amount: payment.salary_amount,
          salary_day: payment.salary_day,
          advance_amount: payment.advance_amount,
          advance_day: payment.advance_day,
          // Use balances from signup form
          initial_balance: payment.initial_balance || 0,
          credit_available: payment.has_credit_card ? payment.credit_limit : 0,
          credit_used: payment.current_credit_used || 0,
          user_status: 'approved', // AUTO APPROVED after payment
          // Subscription dates
          subscription_type: 'PREMIUM',
          subscription_status: 'active',
          subscription_start_date: subscriptionStartDate,
          subscription_end_date: subscriptionEndDate,
          // Activate affiliate mode if coming from admin link
          is_affiliate: activateAffiliate,
          affiliate_code: activateAffiliate ? matricula.toString() : null,
          affiliate_balance: 0,
        });

      if (userError) {
        console.error('Error creating user:', userError);
        throw new Error('Error creating user account');
      }

      // Update payment with matricula
      await supabase
        .from('payments')
        .update({ matricula: matricula })
        .eq('id', payment.id);

      console.log('User created with matricula:', matricula);

      // If affiliate, create affiliate invite record and release commission immediately
      if (payment.affiliate_code) {
        // FIXED: Commission is always 50% of the payment amount
        // This is the rule: 50% commission always, regardless of plan or admin settings
        const commissionAmount = payment.amount * 0.50;

        console.log('Calculating 50% commission:', {
          paymentAmount: payment.amount,
          commissionAmount: commissionAmount,
          affiliateCode: payment.affiliate_code
        });

        // Create affiliate invite - auto approved
        const { error: inviteError } = await supabase
          .from('affiliate_invites')
          .insert({
            inviter_matricula: payment.affiliate_code,
            invited_matricula: matricula,
            status: 'approved',
          });

        if (inviteError) {
          console.error('Error creating affiliate invite:', inviteError);
        }

        // Create released commission
        const { error: commissionError } = await supabase
          .from('affiliate_commissions')
          .insert({
            affiliate_matricula: payment.affiliate_code,
            invited_matricula: matricula,
            amount: commissionAmount,
            status: 'released',
            released_at: new Date().toISOString(),
          });

        if (commissionError) {
          console.error('Error creating commission:', commissionError);
        }

        // Update affiliate balance
        const { data: affiliateData } = await supabase
          .from('users_matricula')
          .select('affiliate_balance')
          .eq('matricula', payment.affiliate_code)
          .single();

        const currentBalance = affiliateData?.affiliate_balance || 0;
        await supabase
          .from('users_matricula')
          .update({ 
            affiliate_balance: currentBalance + commissionAmount,
            is_affiliate: true 
          })
          .eq('matricula', payment.affiliate_code);

        console.log('Affiliate commission released:', commissionAmount, 'for affiliate:', payment.affiliate_code);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: paymentStatus,
        message: 'Webhook processed successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in mp-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
