-- ============================================
-- Update user registration trigger to use company name from signup
-- ============================================

CREATE OR REPLACE FUNCTION public.assign_default_customer_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
AS $$
DECLARE
  new_company_id UUID;
  company_name_from_metadata TEXT;
BEGIN
  -- Only assign if no role exists yet
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.id
  ) THEN
    -- Get company name from user metadata, fallback to full name or 'My Company'
    company_name_from_metadata := COALESCE(
      NEW.raw_user_meta_data->>'company_name',
      NEW.raw_user_meta_data->>'full_name',
      'My Company'
    );
    
    -- Create a company for the new user
    INSERT INTO public.companies (name, owner_id, description, is_active)
    VALUES (
      company_name_from_metadata,
      NEW.id,
      'Company account',
      true
    )
    RETURNING id INTO new_company_id;
    
    -- Assign customer role with the new company
    INSERT INTO public.user_roles (user_id, company_id, role, is_active)
    VALUES (NEW.id, new_company_id, 'customer', true);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger to ensure it's active
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_customer_role();

-- Add helpful comment
COMMENT ON FUNCTION public.assign_default_customer_role() IS 'Automatically creates a company and assigns customer role to new users. Uses company_name from user metadata if provided.';