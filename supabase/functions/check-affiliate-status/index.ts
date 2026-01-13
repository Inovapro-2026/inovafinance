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

    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    console.log('Checking affiliate status...');
    console.log('Current time:', now.toISOString());
    console.log('7 days ago:', sevenDaysAgo.toISOString());
    console.log('24 hours ago:', twentyFourHoursAgo.toISOString());

    // 1. Find affiliates who haven't made a sale in 7 days and should be deactivated
    // Only for admin-created affiliates (is_admin_affiliate = true)
    const { data: affiliatesToDeactivate, error: deactError } = await supabase
      .from('users_matricula')
      .select('matricula, full_name, email, phone, admin_affiliate_created_at, last_affiliate_sale_at')
      .eq('is_admin_affiliate', true)
      .eq('is_affiliate', true)
      .is('affiliate_deactivated_at', null)
      .or(`last_affiliate_sale_at.is.null,last_affiliate_sale_at.lt.${sevenDaysAgo.toISOString()}`)
      .lt('admin_affiliate_created_at', sevenDaysAgo.toISOString());

    if (deactError) {
      console.error('Error fetching affiliates to deactivate:', deactError);
    }

    console.log(`Found ${affiliatesToDeactivate?.length || 0} affiliates to deactivate`);

    // Deactivate affiliates who haven't made sales in 7 days
    if (affiliatesToDeactivate && affiliatesToDeactivate.length > 0) {
      for (const affiliate of affiliatesToDeactivate) {
        console.log(`Deactivating affiliate: ${affiliate.matricula} - ${affiliate.full_name}`);
        
        const { error: updateError } = await supabase
          .from('users_matricula')
          .update({
            is_affiliate: false,
            blocked: true,
            affiliate_deactivated_at: now.toISOString(),
            subscription_status: 'suspended',
          })
          .eq('matricula', affiliate.matricula);

        if (updateError) {
          console.error(`Error deactivating affiliate ${affiliate.matricula}:`, updateError);
        }
      }
    }

    // 2. Find affiliates deactivated more than 24h ago that should be deleted
    const { data: affiliatesToDelete, error: delError } = await supabase
      .from('users_matricula')
      .select('matricula, full_name, email, affiliate_deactivated_at')
      .eq('is_admin_affiliate', true)
      .not('affiliate_deactivated_at', 'is', null)
      .lt('affiliate_deactivated_at', twentyFourHoursAgo.toISOString());

    if (delError) {
      console.error('Error fetching affiliates to delete:', delError);
    }

    console.log(`Found ${affiliatesToDelete?.length || 0} affiliates to delete`);

    // Delete affiliates whose accounts were deactivated 24h ago
    if (affiliatesToDelete && affiliatesToDelete.length > 0) {
      for (const affiliate of affiliatesToDelete) {
        console.log(`Deleting affiliate: ${affiliate.matricula} - ${affiliate.full_name}`);

        // Delete related data first
        await supabase.from('transactions').delete().eq('user_matricula', affiliate.matricula);
        await supabase.from('categories').delete().eq('user_matricula', affiliate.matricula);
        await supabase.from('goals').delete().eq('user_matricula', affiliate.matricula);
        await supabase.from('scheduled_payments').delete().eq('user_matricula', affiliate.matricula);
        await supabase.from('payment_logs').delete().eq('user_matricula', affiliate.matricula);

        // Delete the user
        const { error: deleteError } = await supabase
          .from('users_matricula')
          .delete()
          .eq('matricula', affiliate.matricula);

        if (deleteError) {
          console.error(`Error deleting affiliate ${affiliate.matricula}:`, deleteError);
        }
      }
    }

    // 3. Process any pending withdrawals automatically
    const { data: pendingWithdrawals, error: wError } = await supabase
      .from('affiliate_withdrawals')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });

    if (wError) {
      console.error('Error fetching pending withdrawals:', wError);
    }

    console.log(`Found ${pendingWithdrawals?.length || 0} pending withdrawals to process`);

    // Process each pending withdrawal
    if (pendingWithdrawals && pendingWithdrawals.length > 0) {
      for (const withdrawal of pendingWithdrawals) {
        try {
          // Call the process withdrawal function
          const response = await fetch(`${supabaseUrl}/functions/v1/process-affiliate-withdrawal`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ withdrawalId: withdrawal.id }),
          });

          const result = await response.json();
          console.log(`Withdrawal ${withdrawal.id} processed:`, result);
        } catch (e) {
          console.error(`Error processing withdrawal ${withdrawal.id}:`, e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        deactivated: affiliatesToDeactivate?.length || 0,
        deleted: affiliatesToDelete?.length || 0,
        withdrawals_processed: pendingWithdrawals?.length || 0,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error checking affiliate status:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
