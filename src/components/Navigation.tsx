import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Building2, Menu, X, Users, FileText, CreditCard, Star, Share2, Settings, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navigationItems = [
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/leads", label: "Leads", icon: Users },
    { href: "/invoices", label: "Invoices", icon: FileText },
    { href: "/payments", label: "Payments", icon: CreditCard },
    { href: "/reviews", label: "Reviews", icon: Star },
    { href: "/social", label: "Social Media", icon: Share2 },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const NavItems = ({ mobile = false }) => (
    <>
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        
        return (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              mobile ? "text-sidebar-foreground" : ""
            } ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary hover:text-secondary-foreground"
            }`}
            onClick={() => mobile && setIsOpen(false)}
          >
            <Icon className="w-5 h-5" />
            <span className={mobile ? "text-lg" : ""}>{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <nav className="bg-sidebar border-b border-sidebar-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-sidebar-primary" />
            <span className="text-xl font-bold text-sidebar-foreground">Construyo</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <NavItems />
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-sidebar-foreground">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-sidebar">
                <div className="flex items-center justify-between mb-8">
                  <Link to="/" className="flex items-center gap-2">
                    <Building2 className="w-8 h-8 text-sidebar-primary" />
                    <span className="text-xl font-bold text-sidebar-foreground">Construyo</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-sidebar-foreground"
                  >
                    <X className="w-6 h-6" />
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  <NavItems mobile />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;