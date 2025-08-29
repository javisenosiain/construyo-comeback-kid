-- Fix missing RLS policies for tables that have RLS enabled but no policies

-- Add missing INSERT policy for users table (needed for user registration)
CREATE POLICY "Users can insert during registration" 
ON public.users 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- Add policies for leads table (currently has RLS but no policies)
CREATE POLICY "Users can view leads they're involved in" 
ON public.leads 
FOR SELECT 
USING (
  customer_id = auth.uid() OR 
  builder_id = auth.uid()
);

CREATE POLICY "Users can create leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (
  customer_id = auth.uid() OR 
  builder_id = auth.uid()
);

CREATE POLICY "Users can update leads they're involved in" 
ON public.leads 
FOR UPDATE 
USING (
  customer_id = auth.uid() OR 
  builder_id = auth.uid()
);

CREATE POLICY "Users can delete their own leads" 
ON public.leads 
FOR DELETE 
USING (customer_id = auth.uid());

-- Add policies for any other tables that might be missing them
-- Check if there are any tables with RLS enabled but no policies by looking at current state