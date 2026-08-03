import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/AdminLayout";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import Home from "./pages/Home";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import Checkout from "./pages/Checkout";
import CheckoutSessionResume from "./pages/CheckoutSessionResume";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import Following from "./pages/Following";
import Settings from "./pages/Settings";
import SignUp from "./pages/SignUp";
import Verify from "./pages/Verify";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminVerification from "./pages/AdminVerification";
import AdminEvents from "./pages/AdminEvents";
import AdminEventSales from "./pages/AdminEventSales";
import AdminRevenue from "./pages/AdminRevenue";
import AdminApiKeys from "./pages/AdminApiKeys";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import AdminSubscriptionPayments from "./pages/AdminSubscriptionPayments";
import AdminEventReviewerPermissions from "./pages/AdminEventReviewerPermissions";
import AdminSystemHealth from "./pages/AdminSystemHealth";
import UserManagement from "./pages/UserManagement";
import EnterpriseSubscription from "./pages/EnterpriseSubscription";
import Organizer from "./pages/Organizer";
import TeamManagement from "./pages/TeamManagement";
import AdminRolesPermissions from "./pages/AdminRolesPermissions";
import AdminVerificationDetail from "./pages/AdminVerificationDetail";
import OrganizerBranding from "./pages/OrganizerBranding";
import OrganizerApiKeys from "./pages/OrganizerApiKeys";
import OrganizerFinancials from "./pages/OrganizerFinancials";
import CheckIn from "./pages/CheckIn";
import EventForm from "./pages/EventForm";
import EventFormNew from "./pages/EventFormNew";
import EventTickets from "./pages/EventTickets";
import EventEnhancements from "./pages/EventEnhancements";
import SeatMapEditor from "./pages/SeatMapEditor";
import OrderHistory from "./pages/OrderHistory";
import Notifications from "./pages/Notifications";
import Pricing from "./pages/Pricing";
import SubscriptionReturn from "./pages/SubscriptionReturn";
import Partners from "./pages/Partners";
import Contact from "./pages/Contact";
import Help from "./pages/Help";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
        <Route
          path="/subscription/return"
          element={
            <ProtectedRoute>
              <PageTransition><SubscriptionReturn /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route path="/partners" element={<PageTransition><Partners /></PageTransition>} />
        <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
        <Route path="/help" element={<PageTransition><Help /></PageTransition>} />
        <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
        <Route path="/events" element={<PageTransition><Events /></PageTransition>} />
        <Route path="/events/:id" element={<PageTransition><EventDetails /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><SignUp /></PageTransition>} />
        <Route path="/verify" element={<PageTransition><Verify /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />

        <Route
          path="/checkout"
          element={
            <PageTransition><Checkout /></PageTransition>
          }
        />
        <Route path="/checkout/session/:token" element={<PageTransition><CheckoutSessionResume /></PageTransition>} />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <PageTransition><Profile /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute>
              <PageTransition><ProfileEdit /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/following"
          element={
            <ProtectedRoute>
              <PageTransition><Following /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route path="/following" element={<Navigate to="/profile/following" replace />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <PageTransition><Settings /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <PageTransition><OrderHistory /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <PageTransition><Notifications /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <PageTransition>
                <AdminLayout />
              </PageTransition>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<AdminDashboard />} />
          <Route path="hub" element={<Admin />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="verification" element={<AdminVerification />} />
          <Route path="verification/:id" element={<AdminVerificationDetail />} />
          <Route path="roles-permissions" element={<AdminRolesPermissions />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="event-sales" element={<AdminEventSales />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="api-keys" element={<AdminApiKeys />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="subscription-payments" element={<AdminSubscriptionPayments />} />
          <Route path="event-reviewer-permissions" element={<AdminEventReviewerPermissions />} />
          <Route path="system-health" element={<AdminSystemHealth />} />
        </Route>

        <Route
          path="/organizer"
          element={
            <ProtectedRoute allowedRoles={["ORGANIZER", "ADMIN"]}>
              <PageTransition><Organizer /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/team"
          element={
            <ProtectedRoute allowedRoles={["ORGANIZER", "ADMIN"]}>
              <PageTransition><TeamManagement /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/branding"
          element={
            <ProtectedRoute allowedRoles={["ORGANIZER", "ADMIN"]}>
              <PageTransition><OrganizerBranding /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/api-keys"
          element={
            <ProtectedRoute allowedRoles={["ORGANIZER", "ADMIN"]}>
              <PageTransition><OrganizerApiKeys /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/financials"
          element={
            <ProtectedRoute allowedRoles={["ORGANIZER", "ADMIN"]}>
              <PageTransition><OrganizerFinancials /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/check-in"
          element={
            <ProtectedRoute allowedRoles={["ORGANIZER", "ADMIN"]}>
              <PageTransition><CheckIn /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/organizer/events/new"
          element={
            <ProtectedRoute allowedRoles={["ORGANIZER", "ADMIN"]}>
              <PageTransition><EventFormNew /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/organizer/events/:id/edit"
          element={
            <ProtectedRoute allowedRoles={["ORGANIZER", "ADMIN"]}>
              <PageTransition><EventFormNew /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/organizer/events/:id/seat-map"
          element={
            <ProtectedRoute allowedRoles={["ORGANIZER", "ADMIN"]}>
              <PageTransition><SeatMapEditor /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/organizer/events/:id/tickets"
          element={
            <ProtectedRoute allowedRoles={["ORGANIZER", "ADMIN"]}>
              <PageTransition><EventTickets /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/organizer/events/:id/enhancements"
          element={
            <ProtectedRoute allowedRoles={["ORGANIZER", "ADMIN"]}>
              <PageTransition><EventEnhancements /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/enterprise/subscription"
          element={
            <ProtectedRoute>
              <PageTransition><EnterpriseSubscription /></PageTransition>
            </ProtectedRoute>
          }
        />
        {/* Profile & legacy links used /subscription/enterprise — keep alias */}
        <Route path="/subscription/enterprise" element={<Navigate to="/enterprise/subscription" replace />} />

        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LanguageProvider>
        <PreferencesProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <CartProvider>
                  <div className="flex flex-col min-h-screen">
                    <Navigation />
                    <main className="flex-1">
                      <ScrollToTop />
                      <AppErrorBoundary>
                        <AnimatedRoutes />
                      </AppErrorBoundary>
                    </main>
                    <Footer />
                  </div>
                </CartProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </PreferencesProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
