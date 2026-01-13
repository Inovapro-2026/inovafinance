import { supabase } from "@/integrations/supabase/client";

export type InviteStatus = 'pending' | 'review' | 'approved' | 'rejected';
export type CommissionStatus = 'locked' | 'released';

export interface AffiliateStats {
    totalInvites: number;
    pendingReviews: number;
    approvedCount: number;
    rejectedCount: number;
    totalCommissions: number;
}

export const affiliateService = {
    /**
     * Records a new invitation during registration
     */
    async recordInvite(inviterMatricula: number, invitedMatricula: number) {
        const { error } = await supabase
            .from('affiliate_invites')
            .insert({
                inviter_matricula: inviterMatricula,
                invited_matricula: invitedMatricula,
                status: 'pending'
            });

        if (error) {
            console.error('Error recording affiliate invite:', error);
            throw error;
        }
    },

    /**
     * Fetches stats for a specific inviter
     */
    async getAffiliateStats(inviterMatricula: number): Promise<AffiliateStats> {
        const { data: invites, error } = await (supabase as any)
            .from('affiliate_invites')
            .select('status')
            .eq('inviter_matricula', inviterMatricula);

        if (error) throw error;

        const typedInvites = (invites || []) as { status: string }[];

        const stats = {
            totalInvites: typedInvites.length,
            pendingReviews: typedInvites.filter(i => i.status === 'pending' || i.status === 'review').length,
            approvedCount: typedInvites.filter(i => i.status === 'approved').length,
            rejectedCount: typedInvites.filter(i => i.status === 'rejected').length,
            totalCommissions: 0
        };

        const { data: commissions, error: commError } = await (supabase as any)
            .from('affiliate_commissions')
            .select('amount')
            .eq('affiliate_matricula', inviterMatricula)
            .eq('status', 'released');

        if (commError) throw commError;

        const typedCommissions = (commissions || []) as { amount: number }[];
        stats.totalCommissions = typedCommissions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

        return stats;
    },

    /**
     * Fetches all invites for the inviter with details
     */
    async getInvitesList(inviterMatricula: number) {
        const { data, error } = await (supabase as any)
            .from('affiliate_invites')
            .select(`
        *,
        invited_user:users_matricula!invited_matricula(full_name, matricula)
      `)
            .eq('inviter_matricula', inviterMatricula)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching invites list:', error);
            throw error;
        }
        return data as any[];
    },

    /**
     * (ADMIN) Fetches all pending invites for review
     */
    async getAllPendingInvites() {
        try {
            const { data, error } = await (supabase as any)
                .from('affiliate_invites')
                .select(`
            *,
            inviter_user:users_matricula!inviter_matricula(full_name, matricula),
            invited_user:users_matricula!invited_matricula(full_name, matricula)
          `)
                .in('status', ['pending', 'review'])
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Supabase error fetching pending invites:', error);
                throw error;
            }
            return data as any[];
        } catch (err) {
            console.error('Catch error fetching pending invites:', err);
            throw err;
        }
    },

    /**
     * (ADMIN) Approves an invite and releases commission
     */
    async approveInvite(inviteId: string, adminId: string, commissionAmount: number = 10.00) {
        // 1. Get invite details including inviter's UUID for logging
        const { data: inviteData, error: fetchError } = await (supabase as any)
            .from('affiliate_invites')
            .select(`
                *,
                inviter_user:users_matricula!inviter_matricula(id)
            `)
            .eq('id', inviteId)
            .single();

        if (fetchError) throw fetchError;
        const invite = inviteData as any;
        const inviterUuid = invite.inviter_user?.id;

        // 2. Update status to approved
        const { error: updateError } = await supabase
            .from('affiliate_invites')
            .update({
                status: 'approved',
                reviewed_at: new Date().toISOString(),
                reviewed_by_admin: adminId
            })
            .eq('id', inviteId);

        if (updateError) throw updateError;

        // 3. Unblock the invited user
        const { error: unblockError } = await (supabase as any)
            .from('users_matricula')
            .update({ blocked: false })
            .eq('matricula', invite.invited_matricula);

        if (unblockError) throw unblockError;

        // 4. Create/Release commission
        const { error: commError } = await supabase
            .from('affiliate_commissions')
            .upsert({
                affiliate_matricula: invite.inviter_matricula,
                invited_matricula: invite.invited_matricula,
                amount: commissionAmount,
                status: 'released',
                released_at: new Date().toISOString()
            });

        if (commError) throw commError;

        // 4.5. Update affiliate's last sale timestamp (resets 7-day counter)
        await supabase
            .from('users_matricula')
            .update({
                last_affiliate_sale_at: new Date().toISOString()
            })
            .eq('matricula', invite.inviter_matricula);

        // 5. Update inviter balance (both initial_balance and affiliate_balance)
        const { data: currentBalanceData, error: balError } = await supabase
            .from('users_matricula')
            .select('initial_balance, affiliate_balance')
            .eq('matricula', invite.inviter_matricula)
            .single();

        if (balError) throw balError;
        const currentBalance = currentBalanceData as any;

        const { error: finalBalError } = await supabase
            .from('users_matricula')
            .update({
                initial_balance: (Number(currentBalance.initial_balance) || 0) + commissionAmount,
                affiliate_balance: (Number(currentBalance.affiliate_balance) || 0) + commissionAmount
            })
            .eq('matricula', invite.inviter_matricula);

        if (finalBalError) throw finalBalError;

        // 5. Log activity
        await (supabase as any).from('admin_logs').insert({
            admin_id: adminId,
            action: 'APPROVE_AFFILIATE',
            details: { invite_id: inviteId, amount: commissionAmount },
            target_user_id: inviterUuid
        });

        return true;
    },

    /**
     * (ADMIN) Rejects an invite
     */
    async rejectInvite(inviteId: string, adminId: string) {
        const { error } = await supabase
            .from('affiliate_invites')
            .update({
                status: 'rejected',
                reviewed_at: new Date().toISOString(),
                reviewed_by_admin: adminId
            })
            .eq('id', inviteId);

        if (error) throw error;
        return true;
    }
};
