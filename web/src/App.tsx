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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/confirm/:code" element={<PublicConfirmation />} />

        {/* Private Routes (Admin) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
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
          <Route path="company/info" element={<CompanyInfo />} />
          <Route path="users" element={<UsersManagement />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
