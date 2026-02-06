import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';

import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import OAuthCallbackPage from '../pages/OAuthCallbackPage';
import CompleteProfilePage from '../pages/CompleteProfilePage';
import FeedPage from '../pages/FeedPage';
import PostDetailPage from '../pages/PostDetailPage';
import ProfilePage from '../pages/ProfilePage';
import EditProfilePage from '../pages/EditProfilePage';
import CreatePostPage from '../pages/CreatePostPage';
import EditPostPage from '../pages/EditPostPage';
import SearchPage from '../pages/SearchPage';
import MyPostsPage from '../pages/MyPostsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <Spinner fullPage />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.isProfileComplete === false) return <Navigate to="/complete-profile" replace />;
  return <>{children}</>;
};

const ProfileCompleteRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <Spinner fullPage />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.isProfileComplete !== false) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Spinner fullPage />;
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="/complete-profile" element={<ProfileCompleteRoute><CompleteProfilePage /></ProfileCompleteRoute>} />

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
        <Route path="/posts/new" element={<ProtectedRoute><CreatePostPage /></ProtectedRoute>} />
        <Route path="/posts/:id" element={<ProtectedRoute><PostDetailPage /></ProtectedRoute>} />
        <Route path="/posts/:id/edit" element={<ProtectedRoute><EditPostPage /></ProtectedRoute>} />
        <Route path="/profile/edit" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
        <Route path="/profile/:id" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
        <Route path="/my-posts" element={<ProtectedRoute><MyPostsPage /></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
