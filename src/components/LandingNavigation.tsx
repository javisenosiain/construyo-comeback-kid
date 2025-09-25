import { useState } from "react";
import { Building2, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface LandingNavigationProps {
  onBetaClick: () => void;
}

const LandingNavigation = ({ onBetaClick }: LandingNavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const navigationItems = [
    { label: "Home", href: "#home" },
    { label: "About", href: "#about" },
    { label: "Features", href: "#features" },
    { label: "Contact", href: "#contact" },
  ];

  const scrollToSection = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-foreground">Constituyo</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.href)}
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Button
              variant="outline"
              onClick={onBetaClick}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Login
            </Button>
            <Button
              onClick={onBetaClick}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              Join Beta
            </Button>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-8 h-8 text-primary" />
                    <span className="text-xl font-bold">Constituyo</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="w-6 h-6" />
                  </Button>
                </div>
                
                <div className="flex flex-col gap-4">
                  {navigationItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => scrollToSection(item.href)}
                      className="text-left text-lg font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                  
                  <div className="border-t border-border pt-4 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        onBetaClick();
                        setIsOpen(false);
                      }}
                      className="w-full mb-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      Login
                    </Button>
                    <Button
                      onClick={() => {
                        onBetaClick();
                        setIsOpen(false);
                      }}
                      className="w-full bg-success hover:bg-success/90 text-success-foreground"
                    >
                      Join Beta
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default LandingNavigation;