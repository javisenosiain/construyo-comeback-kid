import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BetaSignupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BetaSignup = ({ open, onOpenChange }: BetaSignupProps) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !name) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Insert beta subscriber
      const { error } = await supabase
        .from('beta_subscribers')
        .insert([
          {
            email: email.toLowerCase().trim(),
            name: name.trim(),
            status: 'pending'
          }
        ]);

      if (error) {
        if (error.code === '23505') { // Unique violation
          toast({
            title: "Already Subscribed",
            description: "This email is already on our beta waitlist!",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        setIsSuccess(true);
        toast({
          title: "Success!",
          description: "Thanks! You'll get Beta access and updates soon.",
        });
        
        // Reset form after 2 seconds
        setTimeout(() => {
          setEmail("");
          setName("");
          setIsSuccess(false);
          onOpenChange(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Beta signup error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-success-foreground" />
            </div>
            Join Beta Waitlist
          </DialogTitle>
          <DialogDescription className="text-left pt-4">
            Constituyo is your AI-powered ally for business compliance. We simplify legal headaches by automating contract analysis, tracking regulatory changes, and generating compliant documents—saving you time and reducing risks. Join our Beta to be among the first to access these tools and transform how your business stays audit-ready.
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-success-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Welcome to the Beta!</h3>
            <p className="text-muted-foreground">
              Thanks! You'll get Beta access and updates soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-success hover:bg-success/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Join Beta
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BetaSignup;