import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import Events from '@/pages/Events';
import EventEdit from './pages/EventEdit';
import Guests from '@/pages/Guests';
import EventsGuests from './pages/EventsGuests';
import EventsSponsors from './pages/EventsSponsors';
import CompanyInfo from './pages/CompanyInfo';
import UsersManagement from './pages/Users';
import Sponsors from '@/pages/Sponsors';
import PublicConfirmation from '@/pages/PublicConfirmation';
import AdminLayout from '@/layouts/AdminLayout';
import Companies from '@/pages/Companies';
import ScanAccess from '@/pages/ScanAccess';

const getUserType = (): string | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try { return JSON.parse(userStr).type; } catch { return null; }
};

const ProtectedRoute = ({ allowedTypes }: { allowedTypes?: string[] }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedTypes) {
    const type = getUserType();
    if (!type) return <Navigate to="/login" replace />;
    if (!allowedTypes.includes(type)) {
      // Redirect superadmins to their own section, others to /admin
      switch (type) {
        case 'superadmin':
          return <Navigate to="/superadmin/companies" replace />;
        case 'admin':
        case 'manager':
          return <Navigate to="/admin" replace />;
        case 'user':
          return <Navigate to="/admin/scan" replace />;
        default:
          return <Navigate to="/login" replace />;
      }
    }
  }
  //  return <>{children}</>;
  return <Outlet />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/confirm/:code" element={<PublicConfirmation />} />

        {/* Private Routes — Superadmin */}
        <Route element={<ProtectedRoute allowedTypes={['superadmin']} />}>
          <Route path="/superadmin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/superadmin/companies" replace />} />
            <Route path="companies" element={<Companies />} />
          </Route>
        </Route>

        {/* Private Routes — Admin / Manager / User */}
        <Route element={<ProtectedRoute allowedTypes={['admin', 'manager', 'user']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={
              getUserType() === 'user' ? <Navigate to="/admin/scan" replace /> : <Events />
            } />

            <Route path="scan" element={<ScanAccess />} />

            {/* Admin and Manager only */}
            <Route element={<ProtectedRoute allowedTypes={['admin', 'manager']} />}>
              <Route path="events/new" element={<EventEdit />} />
              <Route path="events/:id" element={<EventEdit />} />
              <Route path="events/:id/guests" element={<EventsGuests />} />
              <Route path="events/:id/sponsors" element={<EventsSponsors />} />
              <Route path="guests" element={<Guests />} />
              <Route path="sponsors" element={<Sponsors />} />
            </Route>

            {/* Only admin */}
            <Route element={<ProtectedRoute allowedTypes={['admin']} />}>
              <Route path="company/info" element={<CompanyInfo />} />
              <Route path="users" element={<UsersManagement />} />
            </Route>
          </Route>
        </Route>
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
