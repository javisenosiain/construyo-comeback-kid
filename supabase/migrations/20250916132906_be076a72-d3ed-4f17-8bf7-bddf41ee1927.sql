-- Create role-based access control system with proper hierarchy
-- This implements the role structure: Super User, Admin, Builder, Viewer, Customer

-- First, create the app_role enum with all required roles
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM (
    'super_user',   -- Internal Construyo role - god mode
    'admin',        -- Company-level full control
    'builder',      -- Operational role - projects and leads
    'viewer',       -- Read-only access within company
    'customer'      -- Client role - own data only
);

-- Create companies table to establish company hierarchy
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    website TEXT,
    logo_url TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create user_roles table to manage role assignments
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    -- Prevent duplicate role assignments per user per company
    UNIQUE(user_id, company_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Update profiles table to support company relationship
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS primary_role public.app_role DEFAULT 'customer';

-- Create security definer functions for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role, _company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id 
      AND role = _role 
      AND is_active = true
      AND (_company_id IS NULL OR company_id = _company_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_user(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id 
      AND role = 'super_user' 
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id 
      AND company_id = _company_id 
      AND role = 'admin' 
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_companies(_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(company_id UUID, company_name TEXT, user_role public.app_role)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id as company_id,
    c.name as company_name,
    ur.role as user_role
  FROM public.companies c
  JOIN public.user_roles ur ON c.id = ur.company_id
  WHERE ur.user_id = _user_id 
    AND ur.is_active = true 
    AND c.is_active = true;
$$;

-- Create RLS policies for companies table
DROP POLICY IF EXISTS "Super users can manage all companies" ON public.companies;
CREATE POLICY "Super users can manage all companies" 
ON public.companies FOR ALL 
USING (public.is_super_user());

DROP POLICY IF EXISTS "Company admins can manage their company" ON public.companies;
CREATE POLICY "Company admins can manage their company" 
ON public.companies FOR ALL 
USING (
  public.is_company_admin(auth.uid(), id) OR 
  owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Company members can view their company" ON public.companies;
CREATE POLICY "Company members can view their company" 
ON public.companies FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND company_id = companies.id 
      AND is_active = true
  )
);

-- Create RLS policies for user_roles table
DROP POLICY IF EXISTS "Super users can manage all user roles" ON public.user_roles;
CREATE POLICY "Super users can manage all user roles" 
ON public.user_roles FOR ALL 
USING (public.is_super_user());

DROP POLICY IF EXISTS "Company admins can manage roles in their company" ON public.user_roles;
CREATE POLICY "Company admins can manage roles in their company" 
ON public.user_roles FOR ALL 
USING (
  public.is_company_admin(auth.uid(), company_id) AND
  role != 'super_user' -- Cannot assign super_user role
);

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT 
USING (user_id = auth.uid());

-- Update profiles RLS policies to work with new role system
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Super users can view all profiles" ON public.profiles;
CREATE POLICY "Super users can view all profiles" 
ON public.profiles FOR SELECT 
USING (public.is_super_user());

DROP POLICY IF EXISTS "Company admins can view company profiles" ON public.profiles;
CREATE POLICY "Company admins can view company profiles" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur1, public.user_roles ur2
    WHERE ur1.user_id = auth.uid() 
      AND ur1.role = 'admin' 
      AND ur1.is_active = true
      AND ur2.user_id = profiles.id
      AND ur2.company_id = ur1.company_id
      AND ur2.is_active = true
  )
);

-- Create trigger to automatically assign customer role on signup
CREATE OR REPLACE FUNCTION public.assign_default_customer_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only assign if no role exists yet
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.id
  ) THEN
    -- Create a personal "company" for customers
    INSERT INTO public.companies (name, owner_id, description)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Account'),
      NEW.id,
      'Personal customer account'
    );
    
    -- Assign customer role
    INSERT INTO public.user_roles (user_id, company_id, role)
    SELECT NEW.id, c.id, 'customer'
    FROM public.companies c
    WHERE c.owner_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user role assignment
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_customer_role();

-- Add timestamp triggers
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON public.user_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON public.user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON public.companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);