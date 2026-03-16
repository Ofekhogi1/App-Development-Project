import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { userApi } from '../api/user.api';
import { useAuth } from '../context/AuthContext';

const schema = z.object({
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(30, 'Max 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers and underscores only'),
});

type FormValues = z.infer<typeof schema>;

const BASE_URL = import.meta.env.VITE_API_URL || '';

const CompleteProfilePage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: user?.username || '' },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const getAvatarSrc = () => {
    if (avatarPreview) return avatarPreview;
    if (user?.avatarUrl) {
      if (user.avatarUrl.startsWith('http')) return user.avatarUrl;
      return `${BASE_URL}${user.avatarUrl}`;
    }
    return undefined;
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    setIsLoading(true);
    setError('');

    const fd = new FormData();
    fd.append('username', values.username);
    if (fileInputRef.current?.files?.[0]) {
      fd.append('avatar', fileInputRef.current.files[0]);
    }

    try {
      const data = await userApi.updateProfile(user._id, fd);
      updateUser(data.user);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Complete your profile</h1>
          <p className="auth-subtitle">Choose a username to get started. You can add a photo too.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="avatar-edit-section">
            <div className="avatar-preview">
              {getAvatarSrc() ? (
                <img src={getAvatarSrc()} alt="Avatar preview" />
              ) : (
                <div className="avatar-placeholder">
                  {user?.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                ref={fileInputRef}
                onChange={handleFileChange}
                id="avatar-input"
                className="file-input"
              />
              <label htmlFor="avatar-input" className="btn btn-secondary btn-sm">
                Choose photo (optional)
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Username *</label>
            <input
              {...register('username')}
              type="text"
              className={`form-input ${errors.username ? 'input-error' : ''}`}
              placeholder="Your username"
              autoFocus
            />
            {errors.username && <span className="error-msg">{errors.username.message}</span>}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Continue'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem' }}>
          <button
            onClick={() => { logout().then(() => navigate('/login')); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Sign out
          </button>
        </p>
      </div>
    </div>
  );
};

export default CompleteProfilePage;
