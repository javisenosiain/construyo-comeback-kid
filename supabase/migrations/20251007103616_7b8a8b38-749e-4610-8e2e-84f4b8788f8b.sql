-- Fix beta_subscribers table RLS policies
-- Remove public SELECT access to prevent email harvesting
DROP POLICY IF EXISTS "Allow public beta signup" ON public.beta_subscribers;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.beta_subscribers;

-- Allow public INSERT only (for beta signup)
CREATE POLICY "Public can signup for beta"
  ON public.beta_subscribers
  FOR INSERT
  WITH CHECK (true);

-- Only admins can view beta subscribers
CREATE POLICY "Only admins can view beta subscribers"
  ON public.beta_subscribers
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Only admins can update beta subscriber status
CREATE POLICY "Only admins can update beta subscribers"
  ON public.beta_subscribers
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can delete beta subscribers
CREATE POLICY "Only admins can delete beta subscribers"
  ON public.beta_subscribers
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Fix profiles table RLS policies
-- Add UPDATE policy so users can only modify their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Add DELETE policy so users can only delete their own profile
CREATE POLICY "Users can delete their own profile"
  ON public.profiles
  FOR DELETE
  USING (id = auth.uid());