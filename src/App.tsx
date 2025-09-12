import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Navigation from "./components/Navigation";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import PlanningData from "./pages/PlanningData";
import CRM from "./pages/CRM";
import AutoResponder from "./pages/AutoResponder";
import Calendly from "./pages/Calendly";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import Reviews from "./pages/Reviews";
import SocialMedia from "./pages/SocialMedia";
import Settings from "./pages/Settings";
import Microsites from "./pages/Microsites";
import FeedbackFormPage from "./pages/FeedbackForm";
import Resolution from "./pages/Resolution";
import GalleryGenerator from "./components/GalleryGenerator";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const isAuthPage = location.pathname === "/auth";
  const isFeedbackPage = location.pathname.startsWith("/feedback/");
  const isResolutionPage = location.pathname.startsWith("/resolution/");

  return (
    <>
      {!isHomePage && !isAuthPage && !isFeedbackPage && !isResolutionPage && (
        <ProtectedRoute>
          <Navigation />
        </ProtectedRoute>
      )}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/leads" element={
          <ProtectedRoute>
            <Leads />
          </ProtectedRoute>
        } />
        <Route path="/planning-data" element={
          <ProtectedRoute>
            <PlanningData />
          </ProtectedRoute>
        } />
        <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
        <Route path="/auto-responder" element={<ProtectedRoute><AutoResponder /></ProtectedRoute>} />
        <Route path="/calendly" element={<ProtectedRoute><Calendly /></ProtectedRoute>} />
        <Route path="/invoices" element={
          <ProtectedRoute>
            <Invoices />
          </ProtectedRoute>
        } />
        <Route path="/payments" element={
          <ProtectedRoute>
            <Payments />
          </ProtectedRoute>
        } />
        <Route path="/reviews" element={
          <ProtectedRoute>
            <Reviews />
          </ProtectedRoute>
        } />
        <Route path="/social" element={
          <ProtectedRoute>
            <SocialMedia />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/microsites" element={
          <ProtectedRoute>
            <Microsites />
          </ProtectedRoute>
        } />
        <Route path="/feedback/:token" element={<FeedbackFormPage />} />
        <Route path="/resolution/:token" element={<Resolution />} />
        <Route path="/portfolio" element={<ProtectedRoute><GalleryGenerator /></ProtectedRoute>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
