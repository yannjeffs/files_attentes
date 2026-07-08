import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Pages
import Login from './pages/auth/Login';
import ServiceSelection from './pages/client/ServiceSelection';
import ClientForm from './pages/client/ClientForm';
import TicketConfirmation from './pages/client/TicketConfirmation';
import AgentDashboard from './pages/agent/AgentDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import QueueDisplay from './pages/display/QueueDisplay';

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
        <Route path="/ticket/confirmation/:ticketId" element={<TicketConfirmation />} />
        <Route path="/display" element={<QueueDisplay />} />
        <Route path="/login" element={<Login />} />

        {/* Agent */}
        <Route
          path="/agent"
          element={
            <ProtectedRoute roles={['Agent', 'Admin']}>
              <AgentDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['Admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;