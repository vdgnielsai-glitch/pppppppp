import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import ScrollToTop from "@/components/ScrollToTop";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import ActiveSession from "./pages/ActiveSession";
import Cars from "./pages/Cars";
import History from "./pages/History";
import Zones from "./pages/Zones";
import Sync from "./pages/Sync";
import Settings from "./pages/Settings";
import Favorites from "./pages/Favorites";
import Premium from "./pages/Premium";
import Profile from "./pages/Profile";
import Onboarding from "./pages/Onboarding";
import ReminderSettings from "./pages/ReminderSettings";
import LocationDetail from "./pages/LocationDetail";
import Timer from "./pages/Timer";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" richColors closeButton />
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route element={<AppLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/zones" element={<Zones />} />
                <Route path="/locatie/:id" element={<LocationDetail />} />
                <Route path="/timer" element={<Timer />} />
                <Route path="/favorieten" element={<Favorites />} />
                <Route path="/historiek" element={<History />} />
                <Route path="/auto" element={<Cars />} />
                <Route path="/instellingen" element={<Settings />} />
                <Route path="/instellingen/waarschuwing" element={<ReminderSettings />} />
                <Route path="/profiel" element={<Profile />} />
                <Route path="/premium" element={<Premium />} />

                {/* legacy aliases — keep old links alive */}
                <Route path="/session/:id" element={<ActiveSession />} />
                <Route path="/cars" element={<Cars />} />
                <Route path="/history" element={<History />} />
                <Route path="/sync" element={<Sync />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
