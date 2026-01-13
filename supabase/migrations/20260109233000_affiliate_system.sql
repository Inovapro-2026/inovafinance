-- Create affiliate_invites table
CREATE TABLE IF NOT EXISTS public.affiliate_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_matricula INTEGER NOT NULL REFERENCES public.users_matricula(matricula),
    invited_matricula INTEGER NOT NULL REFERENCES public.users_matricula(matricula),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'review', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by_admin UUID REFERENCES auth.users(id),
    UNIQUE(invited_matricula) -- One user can only be invited once
);

-- Create affiliate_commissions table
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_matricula INTEGER NOT NULL REFERENCES public.users_matricula(matricula),
    invited_matricula INTEGER NOT NULL REFERENCES public.users_matricula(matricula),
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'released')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    released_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(invited_matricula) -- One commission per invited user
);

-- Enable RLS
ALTER TABLE public.affiliate_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- Policies for affiliate_invites
CREATE POLICY "Users can view their own invites (as inviter)" ON public.affiliate_invites
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users_matricula 
            WHERE matricula = public.affiliate_invites.inviter_matricula 
            AND id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all invites" ON public.affiliate_invites
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies for affiliate_commissions
CREATE POLICY "Users can view their own commissions" ON public.affiliate_commissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users_matricula 
            WHERE matricula = public.affiliate_commissions.affiliate_matricula 
            AND id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all commissions" ON public.affiliate_commissions
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));
