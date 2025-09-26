-- Add documentation comments to clarify security definer usage
COMMENT ON FUNCTION public.assign_default_customer_role() IS 
'SECURITY DEFINER: Required to bypass RLS when creating initial user roles during registration. Uses controlled logic to prevent privilege escalation.';

COMMENT ON FUNCTION public.audit_profile_access() IS 
'SECURITY DEFINER: Required to log security events regardless of user permissions for compliance auditing.';

COMMENT ON FUNCTION public.audit_business_settings_access() IS 
'SECURITY DEFINER: Required to log access to sensitive business data for security monitoring.';

COMMENT ON FUNCTION public.check_auth_rate_limit(inet, text) IS 
'SECURITY DEFINER: Required to manage authentication rate limits at system level to prevent abuse.';

COMMENT ON FUNCTION public.check_endpoint_rate_limit(text, inet, integer, integer) IS 
'SECURITY DEFINER: Required to manage endpoint rate limits at system level to prevent abuse.';

COMMENT ON FUNCTION public.log_sensitive_access(text, text, uuid, text[]) IS 
'SECURITY DEFINER: Required to log sensitive data access for compliance auditing regardless of user permissions.';

COMMENT ON FUNCTION public.log_security_event(text, text, uuid, text[], jsonb, text) IS 
'SECURITY DEFINER: Required to log security events for monitoring and compliance regardless of user permissions.';

COMMENT ON FUNCTION public.log_enhanced_security_event(text, inet, text, text, uuid, jsonb, text) IS 
'SECURITY DEFINER: Required to log enhanced security events for monitoring and compliance regardless of user permissions.';