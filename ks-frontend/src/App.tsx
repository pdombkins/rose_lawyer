import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ProfileProvider } from "./contexts/ProfileContext";
import Index from "./pages/Index";
import About from "./pages/About";
import Offices from "./pages/Offices";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import RouteBridge from "./components/RouteBridge";

// Lazy load non-critical pages
const ProfileSelection = lazy(() => import("./pages/ProfileSelection"));
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const MatterDetail = lazy(() => import("./pages/dashboard/MatterDetail"));
const CRM = lazy(() => import("./pages/dashboard/CRM"));
const AdminControls = lazy(() => import("./pages/dashboard/AdminControls"));
const TimeEntry = lazy(() => import("./pages/dashboard/TimeEntry"));
const TaskCreation = lazy(() => import("./pages/dashboard/TaskCreation"));
const KnowledgeLibrary = lazy(() => import("./pages/dashboard/KnowledgeLibrary"));
const Reports = lazy(() => import("./pages/dashboard/Reports"));
const Calendar = lazy(() => import("./pages/dashboard/Calendar"));
const Services = lazy(() => import("./pages/services/Services"));
const MergersAcquisitions = lazy(() => import("./pages/services/MergersAcquisitions"));
const CorporateRestructuring = lazy(() => import("./pages/services/CorporateRestructuring"));
const PrivateEquity = lazy(() => import("./pages/services/PrivateEquity"));
const DueDiligence = lazy(() => import("./pages/services/DueDiligence"));
const CapitalMarkets = lazy(() => import("./pages/services/CapitalMarkets"));
const EmploymentLaw = lazy(() => import("./pages/services/EmploymentLaw"));
const Property = lazy(() => import("./pages/services/Property"));
const PrivacyCyber = lazy(() => import("./pages/services/PrivacyCyber"));
const ClientIntake = lazy(() => import("./pages/ClientIntake"));
const DataTables = lazy(() => import("./pages/dashboard/DataTables"));
const Diagnostics = lazy(() => import("./pages/Diagnostics"));

const queryClient = new QueryClient();

/**
 * K&S has no login of its own any more — one account serves both apps.
 * Anyone hitting a legacy /auth, /login, /signin or /staff-login URL is
 * bounced to Rose's sign-in and returned here afterwards.
 */
const RoseLogin = () => {
  if (typeof window !== "undefined") {
    window.location.replace(`/login?returnTo=${encodeURIComponent("/firm/dashboard")}`);
  }
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ProfileProvider>
        <Toaster />
        <Sonner />
        {/* BrowserRouter (not HashRouter) with basename="/firm": the app is
            served from rose.lawyer/firm, so it shares an origin — and
            therefore a Supabase auth session — with Rose. Clean URLs also
            mean the routes below can be linked to directly from Rose. */}
        <BrowserRouter basename="/firm">
          {/* Keeps the Rose host URL in step, and redirects direct /firm hits
              into the Rose shell so the sidebar is never lost. */}
          <RouteBridge />
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-burgundy"></div>
            </div>
          }>
            <Routes>
              {/* Public marketing site — unchanged, and deliberately open. */}
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/offices" element={<Offices />} />
              <Route path="/profile-selection" element={<ProtectedRoute><ProfileSelection /></ProtectedRoute>} />
              {/* Every dashboard route requires a real account. Previously
                  all of these were reachable by anyone with the URL. */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/matter/:id" element={<ProtectedRoute><MatterDetail /></ProtectedRoute>} />
              <Route path="/dashboard/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
              <Route path="/dashboard/admin" element={<ProtectedRoute requireAdmin><AdminControls /></ProtectedRoute>} />
              <Route path="/admin/data-tables" element={<ProtectedRoute requireAdmin><DataTables /></ProtectedRoute>} />
              <Route path="/dashboard/time-entry" element={<ProtectedRoute><TimeEntry /></ProtectedRoute>} />
              <Route path="/dashboard/tasks" element={<ProtectedRoute><TaskCreation /></ProtectedRoute>} />
              <Route path="/dashboard/knowledge" element={<ProtectedRoute><KnowledgeLibrary /></ProtectedRoute>} />
              <Route path="/dashboard/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/dashboard/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
              <Route path="/services" element={<Services />} />
              <Route path="/services/mergers-acquisitions" element={<MergersAcquisitions />} />
              <Route path="/services/corporate-restructuring" element={<CorporateRestructuring />} />
              <Route path="/services/private-equity" element={<PrivateEquity />} />
              <Route path="/services/due-diligence" element={<DueDiligence />} />
              <Route path="/services/capital-markets" element={<CapitalMarkets />} />
              <Route path="/services/employment-law" element={<EmploymentLaw />} />
              <Route path="/services/property" element={<Property />} />
              <Route path="/services/privacy-cyber" element={<PrivacyCyber />} />
              <Route path="/client-intake" element={<ClientIntake />} />
              {/* Diagnostics dumps raw table contents — instructor only. */}
              <Route path="/diag" element={<ProtectedRoute requireAdmin><Diagnostics /></ProtectedRoute>} />
              {/* Legacy redirects. The four former login routes all resolve to
                  Rose's single sign-in; there is no separate K&S login. */}
              <Route path="/intake" element={<Navigate to="/client-intake" replace />} />
              <Route path="/auth" element={<RoseLogin />} />
              <Route path="/login" element={<RoseLogin />} />
              <Route path="/signin" element={<RoseLogin />} />
              <Route path="/staff-login" element={<RoseLogin />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ProfileProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
