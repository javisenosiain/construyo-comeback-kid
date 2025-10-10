-- ============================================
-- Fix: Add company_id to leads table and create RLS policies
-- Security Issue: Missing multi-tenant access control
-- Note: This version handles leads without company assignments
-- ============================================

-- Step 1: Add company_id column to leads table (nullable for now)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Step 2: Populate company_id from user's primary company where possible
UPDATE public.leads l
SET company_id = (
  SELECT ur.company_id 
  FROM public.user_roles ur 
  WHERE ur.user_id = l.created_by 
  AND ur.is_active = true 
  ORDER BY ur.assigned_at ASC 
  LIMIT 1
)
WHERE company_id IS NULL 
AND EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = l.created_by 
  AND ur.is_active = true
);

-- Step 3: For leads without a company assignment, create a "Legacy" company
-- and assign them there (this ensures we don't lose data)
DO $$
DECLARE
  legacy_company_id UUID;
BEGIN
  -- Check if any leads still have NULL company_id
  IF EXISTS (SELECT 1 FROM public.leads WHERE company_id IS NULL) THEN
    -- Get or create a "Legacy Leads" company
    SELECT id INTO legacy_company_id 
    FROM public.companies 
    WHERE name = 'Legacy Leads' 
    LIMIT 1;
    
    IF legacy_company_id IS NULL THEN
      INSERT INTO public.companies (name, description, is_active)
      VALUES ('Legacy Leads', 'System-created company for migrated leads without company assignments', false)
      RETURNING id INTO legacy_company_id;
    END IF;
    
    -- Assign orphaned leads to legacy company
    UPDATE public.leads 
    SET company_id = legacy_company_id 
    WHERE company_id IS NULL;
  END IF;
END $$;

-- Step 4: Now make company_id NOT NULL
ALTER TABLE public.leads 
ALTER COLUMN company_id SET NOT NULL;

-- Step 5: Enable RLS on leads table
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Company members can view company leads" ON public.leads;
DROP POLICY IF EXISTS "Admins and builders can create leads" ON public.leads;
DROP POLICY IF EXISTS "Admins and builders can update company leads" ON public.leads;
DROP POLICY IF EXISTS "Only admins can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Super users can manage all leads" ON public.leads;

-- Step 7: CREATE comprehensive RLS policies

-- SELECT: Company members can view leads within their company
CREATE POLICY "Company members can view company leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.company_id = leads.company_id
    AND ur.is_active = true
    AND ur.role IN ('admin', 'builder', 'viewer')
  )
);

-- INSERT: Admins and builders can create leads
CREATE POLICY "Admins and builders can create leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.company_id = leads.company_id
    AND ur.is_active = true
    AND ur.role IN ('admin', 'builder')
  )
);

-- UPDATE: Admins and builders can update leads
CREATE POLICY "Admins and builders can update company leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.company_id = leads.company_id
    AND ur.is_active = true
    AND ur.role IN ('admin', 'builder')
  )
);

-- DELETE: Only admins can delete leads
CREATE POLICY "Only admins can delete leads"
ON public.leads
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.company_id = leads.company_id
    AND ur.is_active = true
    AND ur.role = 'admin'
  )
);

-- Super users can manage all leads
CREATE POLICY "Super users can manage all leads"
ON public.leads
FOR ALL
TO authenticated
USING (
  public.is_super_user(auth.uid())
);

-- Step 8: Add index for performance
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON public.leads(company_id);

-- Step 9: Add helpful comments
COMMENT ON TABLE public.leads IS 'Leads table with multi-tenant RLS policies enforcing company-scoped access control';
COMMENT ON COLUMN public.leads.company_id IS 'References the company this lead belongs to for multi-tenant isolation';