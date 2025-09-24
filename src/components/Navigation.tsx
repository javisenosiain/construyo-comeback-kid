import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Building2, Menu, X, Users, FileText, CreditCard, Star, Share2, Settings, BarChart3, LogOut, User, Database, Globe, MessageSquare, Calendar, Image, ChevronDown, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [leadsOpen, setLeadsOpen] = useState(true);
  const [marketingOpen, setMarketingOpen] = useState(true);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const navigationSections = [
    {
      title: "Core",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
      ]
    },
    {
      title: "Capturing Leads",
      icon: Target,
      isCollapsible: true,
      isOpen: leadsOpen,
      setIsOpen: setLeadsOpen,
      items: [
        { href: "/leads", label: "Current Leads", icon: Users },
        { href: "/planning-data", label: "Planning Data", icon: Database },
        { href: "/calendly", label: "Calendly Meetings", icon: Calendar },
        { href: "/auto-responder", label: "Auto Responder", icon: MessageSquare },
        { href: "/invoices", label: "Invoices & Payments", icon: FileText },
      ]
    },
    {
      title: "Marketing",
      icon: TrendingUp,
      isCollapsible: true,
      isOpen: marketingOpen,
      setIsOpen: setMarketingOpen,
      items: [
        { href: "/reviews", label: "Reviews", icon: Star },
        { href: "/portfolio", label: "Portfolio", icon: Image },
        { href: "/social", label: "Social Media", icon: Share2 },
      ]
    },
    {
      title: "Tools",
      items: [
        { href: "/crm", label: "CRM", icon: Database },
        { href: "/microsites", label: "Microsites", icon: Globe },
        { href: "/payments", label: "Payments", icon: CreditCard },
        { href: "/settings", label: "Settings", icon: Settings },
      ]
    }
  ];

  const NavItems = ({ mobile = false }) => (
    <div className="space-y-2">
      {navigationSections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="space-y-1">
          {section.isCollapsible ? (
            <Collapsible open={section.isOpen} onOpenChange={section.setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={`w-full justify-between px-3 py-2 h-auto font-medium ${
                    mobile ? "text-sidebar-foreground" : "text-gray-700"
                  } hover:bg-gray-200`}
                >
                  <div className="flex items-center gap-2">
                    {section.icon && <section.icon className="w-4 h-4" />}
                    <span className={mobile ? "text-base" : "text-sm"}>{section.title}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${section.isOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1">
                <div className={mobile ? "pl-6 space-y-1" : "pl-4 space-y-1"}>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          mobile ? "text-sidebar-foreground" : "text-gray-600"
                        } ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-gray-100 hover:text-gray-900"
                        }`}
                        onClick={() => mobile && setIsOpen(false)}
                      >
                        <Icon className="w-4 h-4" />
                        <span className={mobile ? "text-sm" : "text-sm"}>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <>
              {section.title !== "Core" && (
                <div className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                  mobile ? "text-sidebar-muted-foreground" : "text-gray-500"
                }`}>
                  {section.title}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        mobile ? "text-sidebar-foreground" : "text-gray-700"
                      } ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-gray-200 hover:text-gray-900"
                      }`}
                      onClick={() => mobile && setIsOpen(false)}
                    >
                      <Icon className="w-5 h-5" />
                      <span className={mobile ? "text-lg" : ""}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <nav className="bg-gray-100 border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-gray-900">Construyo</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <NavItems />
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-gray-700 hover:text-gray-900 hover:bg-gray-200">
                  <User className="w-5 h-5 mr-2" />
                  {user?.email}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-700 hover:text-gray-900 hover:bg-gray-200">
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
                  <div className="pt-4 border-t border-sidebar-border">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-sidebar-foreground"
                      onClick={() => signOut()}
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      Sign Out
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

export default Navigation;