-- Fix security issues: Add missing search_path to functions
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8-character code
    code := upper(substring(encode(gen_random_bytes(6), 'base64') from 1 for 8));
    
    -- Remove any potentially confusing characters
    code := replace(code, '0', 'A');
    code := replace(code, 'O', 'B');
    code := replace(code, 'I', 'C');
    code := replace(code, 'L', 'D');
    code := replace(code, '1', 'E');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = code) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$;