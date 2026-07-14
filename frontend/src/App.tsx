import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

// Pages
import Login from "./pages/auth/Login";
import ServiceSelection from "./pages/client/ServiceSelection";
import ClientForm from "./pages/client/ClientForm";
import TicketConfirmation from "./pages/client/TicketConfirmation";
import AgentDashboard from "./pages/agent/AgentDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import QueueDisplay from "./pages/display/QueueDisplay";
import TicketTracking from "./pages/client/TicketTracking";
import AdminLayout from "./pages/admin/AdminLayout";
import ServicesManager from "./pages/admin/ServicesManager";
import type { JSX } from "react";
import AgentsManager from "./pages/admin/AgentsManager";
import AuditLogs from "./pages/admin/AuditLogs";
import CountersManager from "./pages/admin/CountersManager";
import Ratings from "./pages/admin/Ratings";
import TicketRating from "./pages/client/TicketRating";

// Guard routes protégées
const ProtectedRoute = ({
  children,
  roles,
}: {
  children: JSX.Element;
  roles?: string[];
}) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role))
    return <Navigate to="/login" replace />;

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<ServiceSelection />} />
        <Route path="/ticket/form/:serviceId" element={<ClientForm />} />
        <Route
          path="/ticket/confirmation/:ticketId"
          element={<TicketConfirmation />}
        />
        <Route path="/display" element={<QueueDisplay />} />
        <Route path="/login" element={<Login />} />
        <Route path="/ticket/suivi/:ticketId" element={<TicketTracking />} />
        <Route path="/ticket/rating/:ticketId" element={<TicketRating />} />
        
        {/* Agent */}
        <Route
          path="/agent"
          element={
            <ProtectedRoute roles={["Agent", "Admin"]}>
              <AgentDashboard />
            </ProtectedRoute>
          }
        />
        // Routes admin — avec layout imbriqué
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["Admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="services" element={<ServicesManager />} />
          <Route path="counters" element={<CountersManager />} />
          <Route path="agents" element={<AgentsManager />} />
          <Route path="logs" element={<AuditLogs />} />
          <Route path="ratings" element={<Ratings />} />
        </Route>
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
