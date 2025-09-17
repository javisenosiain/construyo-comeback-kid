-- Create Leads and Customers entities with role-based permissions and tenant isolation
-- This version properly handles the foreign key constraint creation

-- Create lead status enum
DROP TYPE IF EXISTS public.lead_status CASCADE;
CREATE TYPE public.lead_status AS ENUM (
    'new',
    'contacted', 
    'qualified',
    'proposal_sent',
    'won',
    'lost'
);

-- Create customer status enum  
DROP TYPE IF EXISTS public.customer_status CASCADE;
CREATE TYPE public.customer_status AS ENUM (
    'active',
    'inactive',
    'archived'
);

-- Create leads table (without customer foreign key reference first)
DROP TABLE IF EXISTS public.leads CASCADE;
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id), -- Builder or Admin assigned to this lead
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Lead information
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company_name TEXT,
    
    -- Contact details
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'UK',
    
    -- Lead details
    lead_source TEXT, -- Where the lead came from (website, referral, etc.)
    status public.lead_status DEFAULT 'new',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    
    -- Project information
    project_type TEXT,
    project_description TEXT,
    estimated_budget_min DECIMAL(12,2),
    estimated_budget_max DECIMAL(12,2),
    estimated_timeline TEXT,
    
    -- Lead management
    notes TEXT,
    tags TEXT[],
    next_follow_up DATE,
    last_contact_date DATE,
    
    -- Conversion tracking (no foreign key constraint yet)
    converted_to_customer_id UUID,
    converted_at TIMESTAMP WITH TIME ZONE,
    conversion_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    archived_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_budget_range CHECK (
        estimated_budget_min IS NULL OR 
        estimated_budget_max IS NULL OR 
        estimated_budget_min <= estimated_budget_max
    )
);

-- Create customers table
DROP TABLE IF EXISTS public.customers CASCADE;
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    primary_contact UUID REFERENCES auth.users(id), -- If customer has account
    
    -- Customer information
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company_name TEXT,
    
    -- Contact details
    billing_address TEXT,
    service_address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'UK',
    
    -- Customer details
    customer_type TEXT DEFAULT 'individual' CHECK (customer_type IN ('individual', 'business')),
    status public.customer_status DEFAULT 'active',
    
    -- Business information
    vat_number TEXT,
    business_registration TEXT,
    
    -- Lead conversion tracking
    original_lead_id UUID REFERENCES public.leads(id),
    conversion_date TIMESTAMP WITH TIME ZONE,
    
    -- Customer management
    notes TEXT,
    tags TEXT[],
    credit_limit DECIMAL(12,2),
    payment_terms INTEGER DEFAULT 30, -- Days
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Now add the foreign key constraint from leads to customers
ALTER TABLE public.leads 
ADD CONSTRAINT fk_leads_converted_customer 
FOREIGN KEY (converted_to_customer_id) REFERENCES public.customers(id);

-- Create lead activities table for audit trail
DROP TABLE IF EXISTS public.lead_activities CASCADE;
CREATE TABLE public.lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'created', 'updated', 'status_changed', 'assigned', 'contacted', 
        'proposal_sent', 'converted', 'archived', 'note_added'
    )),
    
    -- Activity details
    old_values JSONB,
    new_values JSONB,
    description TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create customer activities table for audit trail
DROP TABLE IF EXISTS public.customer_activities CASCADE;
CREATE TABLE public.customer_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'created', 'updated', 'project_added', 'invoice_sent', 
        'payment_received', 'review_requested', 'archived', 'note_added'
    )),
    
    -- Activity details
    old_values JSONB,
    new_values JSONB,
    description TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Leads
-- Super users can see everything
CREATE POLICY "Super users can manage all leads" 
ON public.leads FOR ALL 
USING (public.is_super_user());

-- Company members can see leads from their company
CREATE POLICY "Company members can view company leads" 
ON public.leads FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.company_id = leads.company_id 
        AND ur.is_active = true
        AND ur.role IN ('admin', 'builder', 'viewer')
    )
);

-- Admins and builders can insert leads for their company
CREATE POLICY "Admins and builders can create leads" 
ON public.leads FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.company_id = leads.company_id 
        AND ur.is_active = true
        AND ur.role IN ('admin', 'builder')
    )
);

-- Admins and builders can update leads in their company
CREATE POLICY "Admins and builders can update leads" 
ON public.leads FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.company_id = leads.company_id 
        AND ur.is_active = true
        AND ur.role IN ('admin', 'builder')
    )
);

-- Only admins can delete leads
CREATE POLICY "Admins can delete leads" 
ON public.leads FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.company_id = leads.company_id 
        AND ur.is_active = true
        AND ur.role = 'admin'
    )
);

-- RLS Policies for Customers
-- Super users can see everything
CREATE POLICY "Super users can manage all customers" 
ON public.customers FOR ALL 
USING (public.is_super_user());

-- Company members can see customers from their company
CREATE POLICY "Company members can view company customers" 
ON public.customers FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.company_id = customers.company_id 
        AND ur.is_active = true
        AND ur.role IN ('admin', 'builder', 'viewer')
    )
);

-- Customer users can see their own customer record
CREATE POLICY "Customers can view their own record" 
ON public.customers FOR SELECT 
USING (primary_contact = auth.uid());

-- Admins and builders can insert customers for their company
CREATE POLICY "Admins and builders can create customers" 
ON public.customers FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.company_id = customers.company_id 
        AND ur.is_active = true
        AND ur.role IN ('admin', 'builder')
    )
);

-- Admins and builders can update customers in their company
CREATE POLICY "Admins and builders can update customers" 
ON public.customers FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.company_id = customers.company_id 
        AND ur.is_active = true
        AND ur.role IN ('admin', 'builder')
    )
);

-- Only admins can delete customers
CREATE POLICY "Admins can delete customers" 
ON public.customers FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.company_id = customers.company_id 
        AND ur.is_active = true
        AND ur.role = 'admin'
    )
);

-- RLS Policies for Lead Activities
CREATE POLICY "Super users can manage all lead activities" 
ON public.lead_activities FOR ALL 
USING (public.is_super_user());

CREATE POLICY "Company members can view lead activities" 
ON public.lead_activities FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.leads l
        JOIN public.user_roles ur ON ur.company_id = l.company_id
        WHERE l.id = lead_activities.lead_id 
        AND ur.user_id = auth.uid() 
        AND ur.is_active = true
        AND ur.role IN ('admin', 'builder', 'viewer')
    )
);

CREATE POLICY "Company members can create lead activities" 
ON public.lead_activities FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.leads l
        JOIN public.user_roles ur ON ur.company_id = l.company_id
        WHERE l.id = lead_activities.lead_id 
        AND ur.user_id = auth.uid() 
        AND ur.is_active = true
        AND ur.role IN ('admin', 'builder')
    )
);

-- RLS Policies for Customer Activities
CREATE POLICY "Super users can manage all customer activities" 
ON public.customer_activities FOR ALL 
USING (public.is_super_user());

CREATE POLICY "Company members can view customer activities" 
ON public.customer_activities FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.customers c
        JOIN public.user_roles ur ON ur.company_id = c.company_id
        WHERE c.id = customer_activities.customer_id 
        AND ur.user_id = auth.uid() 
        AND ur.is_active = true
        AND ur.role IN ('admin', 'builder', 'viewer')
    )
);

CREATE POLICY "Customers can view their own activities" 
ON public.customer_activities FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.customers c
        WHERE c.id = customer_activities.customer_id 
        AND c.primary_contact = auth.uid()
    )
);

CREATE POLICY "Company members can create customer activities" 
ON public.customer_activities FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.customers c
        JOIN public.user_roles ur ON ur.company_id = c.company_id
        WHERE c.id = customer_activities.customer_id 
        AND ur.user_id = auth.uid() 
        AND ur.is_active = true
        AND ur.role IN ('admin', 'builder')
    )
);

-- Create functions for lead conversion workflow
CREATE OR REPLACE FUNCTION public.convert_lead_to_customer(
    p_lead_id UUID,
    p_conversion_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lead RECORD;
    v_customer_id UUID;
    v_user_company_id UUID;
BEGIN
    -- Get user's company
    SELECT company_id INTO v_user_company_id
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('admin', 'builder')
    LIMIT 1;
    
    IF v_user_company_id IS NULL THEN
        RAISE EXCEPTION 'User does not have permission to convert leads';
    END IF;
    
    -- Get lead details
    SELECT * INTO v_lead
    FROM public.leads 
    WHERE id = p_lead_id 
    AND company_id = v_user_company_id;
    
    IF v_lead IS NULL THEN
        RAISE EXCEPTION 'Lead not found or access denied';
    END IF;
    
    IF v_lead.converted_to_customer_id IS NOT NULL THEN
        RAISE EXCEPTION 'Lead has already been converted';
    END IF;
    
    -- Create customer from lead
    INSERT INTO public.customers (
        company_id,
        created_by,
        first_name,
        last_name,
        email,
        phone,
        company_name,
        service_address,
        city,
        postal_code,
        country,
        original_lead_id,
        conversion_date,
        notes,
        tags
    ) VALUES (
        v_lead.company_id,
        auth.uid(),
        v_lead.first_name,
        v_lead.last_name,
        v_lead.email,
        v_lead.phone,
        v_lead.company_name,
        v_lead.address,
        v_lead.city,
        v_lead.postal_code,
        v_lead.country,
        p_lead_id,
        now(),
        v_lead.notes,
        v_lead.tags
    ) RETURNING id INTO v_customer_id;
    
    -- Update lead status and conversion info
    UPDATE public.leads 
    SET 
        status = 'won',
        converted_to_customer_id = v_customer_id,
        converted_at = now(),
        conversion_notes = p_conversion_notes,
        updated_at = now()
    WHERE id = p_lead_id;
    
    -- Log lead activity
    INSERT INTO public.lead_activities (
        lead_id,
        user_id,
        activity_type,
        description,
        new_values
    ) VALUES (
        p_lead_id,
        auth.uid(),
        'converted',
        'Lead converted to customer',
        jsonb_build_object('customer_id', v_customer_id, 'conversion_notes', p_conversion_notes)
    );
    
    -- Log customer activity
    INSERT INTO public.customer_activities (
        customer_id,
        user_id,
        activity_type,
        description,
        new_values
    ) VALUES (
        v_customer_id,
        auth.uid(),
        'created',
        'Customer created from lead conversion',
        jsonb_build_object('original_lead_id', p_lead_id)
    );
    
    RETURN v_customer_id;
END;
$$;

-- Create triggers for automatic activity logging
CREATE OR REPLACE FUNCTION public.log_lead_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.lead_activities (
            lead_id, user_id, activity_type, description, new_values
        ) VALUES (
            NEW.id, NEW.created_by, 'created', 'Lead created', to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF OLD.status != NEW.status THEN
            INSERT INTO public.lead_activities (
                lead_id, user_id, activity_type, description, old_values, new_values
            ) VALUES (
                NEW.id, auth.uid(), 'status_changed', 
                'Status changed from ' || OLD.status || ' to ' || NEW.status,
                jsonb_build_object('status', OLD.status),
                jsonb_build_object('status', NEW.status)
            );
        END IF;
        
        -- Log assignment changes
        IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
            INSERT INTO public.lead_activities (
                lead_id, user_id, activity_type, description, old_values, new_values
            ) VALUES (
                NEW.id, auth.uid(), 'assigned', 'Lead assignment changed',
                jsonb_build_object('assigned_to', OLD.assigned_to),
                jsonb_build_object('assigned_to', NEW.assigned_to)
            );
        END IF;
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_customer_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.original_lead_id IS NULL THEN
        -- Only log direct customer creation (not lead conversion)
        INSERT INTO public.customer_activities (
            customer_id, user_id, activity_type, description, new_values
        ) VALUES (
            NEW.id, NEW.created_by, 'created', 'Customer created', to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.customer_activities (
            customer_id, user_id, activity_type, description, old_values, new_values
        ) VALUES (
            NEW.id, auth.uid(), 'updated', 'Customer updated',
            to_jsonb(OLD), to_jsonb(NEW)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Create triggers
CREATE TRIGGER log_lead_changes_trigger
    AFTER INSERT OR UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.log_lead_changes();

CREATE TRIGGER log_customer_changes_trigger
    AFTER INSERT OR UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.log_customer_changes();

-- Add update timestamp triggers
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_leads_company_id ON public.leads(company_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_created_at ON public.leads(created_at);
CREATE INDEX idx_leads_email ON public.leads(email);

CREATE INDEX idx_customers_company_id ON public.customers(company_id);
CREATE INDEX idx_customers_status ON public.customers(status);
CREATE INDEX idx_customers_primary_contact ON public.customers(primary_contact);
CREATE INDEX idx_customers_created_at ON public.customers(created_at);
CREATE INDEX idx_customers_email ON public.customers(email);

CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX idx_lead_activities_created_at ON public.lead_activities(created_at);

CREATE INDEX idx_customer_activities_customer_id ON public.customer_activities(customer_id);
CREATE INDEX idx_customer_activities_created_at ON public.customer_activities(created_at);