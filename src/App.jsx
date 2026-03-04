import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useUIStore from './stores/useUIStore';
import useAuth from './hooks/useAuth';
import useAuthStore from './stores/useAuthStore';
import MainLayout from './components/layout/MainLayout';
import Landing from './pages/Landing/Landing';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import UniversityList from './pages/University/UniversityList';
import UniversityDetail from './pages/University/UniversityDetail';
import MajorList from './pages/Major/MajorList';
import MajorDetail from './pages/Major/MajorDetail';
import Recommend from './pages/Recommend/Recommend';
import PlanList from './pages/Plan/PlanList';
import PlanDetail from './pages/Plan/PlanDetail';
import Analytics from './pages/Analytics/Analytics';
import Assistant from './pages/Assistant/Assistant';
import Profile from './pages/Profile/Profile';
import Pricing from './pages/Pricing/Pricing';
import DataSyncAdmin from './pages/Admin/DataSync';
import { NotFound } from './pages/Placeholder/Placeholder';

/**
 * Admin route guard — redirects non-admin users to homepage
 */
function AdminRoute({ children }) {
  const { user, loading } = useAuthStore();
  const isAdmin = user?.profile?.role === 'admin';

  if (loading) return null; // Still loading auth state
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppContent() {
  const { theme } = useUIStore();
  useAuth();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Landing />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* University */}
        <Route path="/universities" element={<UniversityList />} />
        <Route path="/universities/:id" element={<UniversityDetail />} />

        {/* Major */}
        <Route path="/majors" element={<MajorList />} />
        <Route path="/majors/:id" element={<MajorDetail />} />

        {/* Recommend */}
        <Route path="/recommend" element={<Recommend />} />

        {/* Plan */}
        <Route path="/plans" element={<PlanList />} />
        <Route path="/plans/:id" element={<PlanDetail />} />

        {/* Analytics */}
        <Route path="/analytics" element={<Analytics />} />

        {/* AI Assistant */}
        <Route path="/assistant" element={<Assistant />} />

        {/* Profile */}
        <Route path="/profile" element={<Profile />} />

        {/* Pricing */}
        <Route path="/pricing" element={<Pricing />} />

        {/* Admin Data Sync — admin only */}
        <Route path="/admin/data" element={
          <AdminRoute>
            <DataSyncAdmin />
          </AdminRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
