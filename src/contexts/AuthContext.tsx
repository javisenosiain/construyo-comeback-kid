import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { clientRateLimit, isValidEmail } from '@/lib/security';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Create business settings for new users
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(async () => {
            try {
              const { data: existingSettings } = await supabase
                .from('business_settings')
                .select('id')
                .eq('user_id', session.user.id)
                .maybeSingle();

              if (!existingSettings) {
                await supabase
                  .from('business_settings')
                  .insert({
                    user_id: session.user.id,
                    business_name: '',
                    business_type: 'General Contractor',
                    default_currency: 'GBP'
                  });
              }
            } catch (error) {
              console.error('Error creating business settings:', error);
            }
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      // Input validation
      if (!isValidEmail(email)) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return { error: new Error("Invalid email") as AuthError };
      }
      
      if (password.length < 6) {
        toast({
          title: "Weak Password",
          description: "Password must be at least 6 characters long",
          variant: "destructive",
        });
        return { error: new Error("Password too short") as AuthError };
      }
      
      // Rate limiting
      const rateLimitKey = `signup_${email}`;
      if (!clientRateLimit.isAllowed(rateLimitKey, 3, 5 * 60 * 1000)) {
        toast({
          title: "Too Many Attempts",
          description: "Too many signup attempts. Please try again later.",
          variant: "destructive",
        });
        return { error: new Error("Rate limited") as AuthError };
      }
      
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName || ''
          }
        }
      });

      if (error) {
        toast({
          title: "Sign Up Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Clear rate limit on success
        clientRateLimit.clear(rateLimitKey);
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link to complete your registration.",
        });
      }

      return { error };
    } catch (error) {
      const authError = error as AuthError;
      toast({
        title: "Sign Up Error",
        description: authError.message,
        variant: "destructive",
      });
      return { error: authError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Input validation
      if (!isValidEmail(email)) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return { error: new Error("Invalid email") as AuthError };
      }
      
      // Rate limiting
      const rateLimitKey = `signin_${email}`;
      if (!clientRateLimit.isAllowed(rateLimitKey, 5, 15 * 60 * 1000)) {
        toast({
          title: "Too Many Attempts",
          description: "Too many login attempts. Please try again later.",
          variant: "destructive",
        });
        return { error: new Error("Rate limited") as AuthError };
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign In Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Clear rate limit on success
        clientRateLimit.clear(rateLimitKey);
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
      }

      return { error };
    } catch (error) {
      const authError = error as AuthError;
      toast({
        title: "Sign In Error",
        description: authError.message,
        variant: "destructive",
      });
      return { error: authError };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast({
          title: "Sign Out Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signed out",
          description: "You have been successfully signed out.",
        });
      }

      return { error };
    } catch (error) {
      const authError = error as AuthError;
      return { error: authError };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        toast({
          title: "Password Reset Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password reset email sent",
          description: "Check your email for a password reset link.",
        });
      }

      return { error };
    } catch (error) {
      const authError = error as AuthError;
      return { error: authError };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};