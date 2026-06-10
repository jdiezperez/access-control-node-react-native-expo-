import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
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
import SuperAdminLayout from '@/layouts/SuperAdminLayout';
import Companies from '@/pages/Companies';

const getUserType = (): string | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try { return JSON.parse(userStr).type; } catch { return null; }
};

const ProtectedRoute = ({ children, allowedTypes }: { children: React.ReactNode, allowedTypes?: string[] }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedTypes) {
    const type = getUserType();
    if (!type) return <Navigate to="/login" replace />;
    if (!allowedTypes.includes(type)) {
      // Redirect superadmins to their own section, others to /admin
      return <Navigate to={type === 'superadmin' ? '/superadmin/companies' : '/admin'} replace />;
    }
  }
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/confirm/:code" element={<PublicConfirmation />} />

        {/* Private Routes — Superadmin */}
        <Route
          path="/superadmin"
          element={
            <ProtectedRoute allowedTypes={['superadmin']}>
              <SuperAdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/superadmin/companies" replace />} />
          <Route path="companies" element={<Companies />} />
        </Route>

        {/* Private Routes — Admin / Manager */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedTypes={['admin', 'manager']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Events />} />
          <Route path="events/new" element={<EventEdit />} />
          <Route path="events/:id" element={<EventEdit />} />
          <Route path="events/:id/guests" element={<EventsGuests />} />
          <Route path="events/:id/sponsors" element={<EventsSponsors />} />
          <Route path="guests" element={<Guests />} />
          <Route path="sponsors" element={<Sponsors />} />
          <Route
            path="company/info"
            element={
              <ProtectedRoute allowedTypes={['admin']}>
                <CompanyInfo />
              </ProtectedRoute>
            }
          />
          <Route path="users" element={<UsersManagement />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
