-- Create enum for user status
CREATE TYPE public.user_status AS ENUM ('pending', 'approved', 'rejected');

-- Add user_status column to users_matricula
ALTER TABLE public.users_matricula 
ADD COLUMN user_status public.user_status NOT NULL DEFAULT 'pending';

-- Update existing users to approved (so they don't get locked out)
UPDATE public.users_matricula SET user_status = 'approved' WHERE user_status = 'pending';

-- Create index for faster status queries
CREATE INDEX idx_users_matricula_status ON public.users_matricula(user_status);