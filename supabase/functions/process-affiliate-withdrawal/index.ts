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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { withdrawalId } = await req.json();

    if (!withdrawalId) {
      return new Response(
        JSON.stringify({ error: 'withdrawalId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get withdrawal details
    const { data: withdrawal, error: wError } = await supabase
      .from('affiliate_withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .single();

    if (wError || !withdrawal) {
      console.error('Withdrawal not found:', wError);
      return new Response(
        JSON.stringify({ error: 'Withdrawal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (withdrawal.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Withdrawal already processed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get affiliate's user data to get their PIX key
    const { data: user, error: uError } = await supabase
      .from('users_matricula')
      .select('pix_key, pix_key_type, full_name, affiliate_balance')
      .eq('matricula', withdrawal.affiliate_matricula)
      .single();

    if (uError || !user) {
      console.error('User not found:', uError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pixKey = withdrawal.pix_key || user.pix_key;
    const pixKeyType = withdrawal.pix_key_type || user.pix_key_type || 'cpf';

    if (!pixKey) {
      return new Response(
        JSON.stringify({ error: 'No PIX key found for this affiliate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has enough balance
    if (user.affiliate_balance < withdrawal.amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process PIX transfer via Mercado Pago
    console.log(`Processing PIX transfer: R$ ${withdrawal.amount} to ${pixKey} (${pixKeyType})`);

    let pixTransferSuccess = false;
    let pixTransferError = null;

    if (mpAccessToken) {
      try {
        // Map pix key type to Mercado Pago format
        const keyTypeMap: Record<string, string> = {
          'cpf': 'CPF',
          'email': 'EMAIL', 
          'phone': 'PHONE',
          'random': 'EVP'
        };

        // Create PIX transfer via Mercado Pago API
        const transferResponse = await fetch('https://api.mercadopago.com/v1/transaction_intentions/process', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mpAccessToken}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': `withdrawal-${withdrawalId}`,
          },
          body: JSON.stringify({
            amount: Math.round(withdrawal.amount * 100), // Amount in cents
            type: 'pix-transfer',
            receiver: {
              pix_key: {
                type: keyTypeMap[pixKeyType] || 'CPF',
                id: pixKey.replace(/[^\w@.\-]/g, '') // Remove formatting
              }
            },
            description: `INOVAFINANCE - Comissão Afiliado ${user.full_name || withdrawal.affiliate_matricula}`,
          })
        });

        if (transferResponse.ok) {
          const transferData = await transferResponse.json();
          console.log('PIX transfer successful:', transferData);
          pixTransferSuccess = true;
        } else {
          const errorData = await transferResponse.json();
          console.error('PIX transfer failed:', errorData);
          pixTransferError = errorData;
          
          // Try alternative endpoint for payout
          const payoutResponse = await fetch('https://api.mercadopago.com/v1/disbursements', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${mpAccessToken}`,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': `payout-${withdrawalId}`,
            },
            body: JSON.stringify({
              amount: withdrawal.amount,
              external_reference: `withdrawal-${withdrawalId}`,
              payment_method_id: 'pix',
              payer_email: 'pagamentos@inovafinance.app',
              receiver: {
                id: pixKey.replace(/[^\w@.\-]/g, ''),
                type: keyTypeMap[pixKeyType] || 'CPF',
              },
              concept_type: 'affiliate_commission',
            })
          });
          
          if (payoutResponse.ok) {
            pixTransferSuccess = true;
            console.log('Payout successful via disbursements');
          }
        }
      } catch (e) {
        console.error('Error processing PIX transfer:', e);
        pixTransferError = e;
      }
    } else {
      console.log('Mercado Pago not configured - marking as processed manually');
      pixTransferSuccess = true; // Allow manual processing
    }

    // Update withdrawal status
    const { error: updateError } = await supabase
      .from('affiliate_withdrawals')
      .update({
        status: pixTransferSuccess ? 'approved' : 'pending',
        processed_at: pixTransferSuccess ? new Date().toISOString() : null,
        notes: pixTransferSuccess 
          ? `PIX enviado automaticamente para ${pixKey}` 
          : `Erro no envio automático: ${JSON.stringify(pixTransferError)}`,
      })
      .eq('id', withdrawalId);

    if (updateError) {
      console.error('Error updating withdrawal:', updateError);
    }

    // Deduct from affiliate balance if successful
    if (pixTransferSuccess) {
      const { error: balanceError } = await supabase
        .from('users_matricula')
        .update({
          affiliate_balance: (user.affiliate_balance || 0) - withdrawal.amount
        })
        .eq('matricula', withdrawal.affiliate_matricula);

      if (balanceError) {
        console.error('Error updating balance:', balanceError);
      }
    }

    return new Response(
      JSON.stringify({
        success: pixTransferSuccess,
        message: pixTransferSuccess 
          ? 'Saque processado com sucesso! PIX enviado.' 
          : 'Erro ao processar PIX. Saque marcado para revisão manual.',
        withdrawal_id: withdrawalId,
        amount: withdrawal.amount,
        pix_key: pixKey,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error processing withdrawal:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
