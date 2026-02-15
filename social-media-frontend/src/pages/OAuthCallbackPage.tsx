import React, { useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { useAuth } from '../context/AuthContext';
import { setAccessToken } from '../api/axiosInstance';
import Spinner from '../components/common/Spinner';

const OAuthCallbackPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    const token = params.get('token');

    if (!token) {
      navigate('/login?error=oauth');
      return;
    }

    // Store token temporarily to make the /me request
    setAccessToken(token);

    authApi
      .getMe()
      .then(({ user }) => {
        flushSync(() => login(token, user));
        if (user.isProfileComplete === false) {
          navigate('/complete-profile');
        } else {
          navigate('/');
        }
      })
      .catch(() => {
        navigate('/login?error=oauth');
      });
  }, []);

  return (
    <div className="auth-page">
      <Spinner fullPage />
      <p style={{ textAlign: 'center', marginTop: '1rem' }}>Completing sign in...</p>
    </div>
  );
};

export default OAuthCallbackPage;
