-- Add missing RLS policies for job_categories and job_templates tables

-- Job categories should be readable by everyone since they're reference data
CREATE POLICY "Everyone can view job categories" 
ON public.job_categories 
FOR SELECT 
USING (active = true);

-- Only allow insert/update/delete for authenticated users (admins would handle this)
CREATE POLICY "Authenticated users can manage job categories" 
ON public.job_categories 
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Job templates should be readable by everyone since they're reference data
CREATE POLICY "Everyone can view job templates" 
ON public.job_templates 
FOR SELECT 
USING (true);

-- Only allow insert/update/delete for authenticated users (admins would handle this)
CREATE POLICY "Authenticated users can manage job templates" 
ON public.job_templates 
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');