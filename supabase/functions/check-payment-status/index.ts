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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(req.url);
    const tempId = url.searchParams.get('temp_id');

    if (!tempId) {
      return new Response(
        JSON.stringify({ error: 'temp_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_temp_id', tempId)
      .single();

    if (error || !payment) {
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If payment is approved but no MP payment ID, try to fetch from MP
    if (payment.payment_status === 'pending' && payment.mp_preference_id) {
      const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
      if (MP_ACCESS_TOKEN) {
        try {
          // Search for payments with this external reference
          const searchResponse = await fetch(
            `https://api.mercadopago.com/v1/payments/search?external_reference=${tempId}`,
            {
              headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
              },
            }
          );

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.results && searchData.results.length > 0) {
              const mpPayment = searchData.results[0];
              
              // Update payment status if changed
              if (mpPayment.status !== payment.payment_status) {
                await supabase
                  .from('payments')
                  .update({
                    payment_status: mpPayment.status,
                    mp_payment_id: mpPayment.id.toString(),
                  })
                  .eq('id', payment.id);
                
                payment.payment_status = mpPayment.status;
                payment.mp_payment_id = mpPayment.id.toString();
              }
            }
          }
        } catch (e) {
          console.error('Error checking MP payment status:', e);
        }
      }
    }

    // Get user info if matricula exists
    let userStatus = null;
    if (payment.matricula) {
      const { data: user } = await supabase
        .from('users_matricula')
        .select('user_status')
        .eq('matricula', payment.matricula)
        .single();
      
      userStatus = user?.user_status || null;
    }

    return new Response(
      JSON.stringify({
        paymentStatus: payment.payment_status,
        matricula: payment.matricula,
        userStatus: userStatus,
        amount: payment.amount,
        fullName: payment.full_name,
        isAffiliate: !!payment.affiliate_code,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in check-payment-status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
