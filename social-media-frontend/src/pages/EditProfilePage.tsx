import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { userApi } from '../api/user.api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';

const schema = z
  .object({
    username: z
      .string()
      .min(3, 'At least 3 characters')
      .max(30, 'Max 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers and underscores only')
      .optional()
      .or(z.literal('')),
    currentPassword: z.string().optional().or(z.literal('')),
    newPassword: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((v) => !v || v.length >= 6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword !== data.confirmPassword) return false;
      return true;
    },
    { message: 'Passwords do not match', path: ['confirmPassword'] }
  );

type FormValues = z.infer<typeof schema>;

const BASE_URL = import.meta.env.VITE_API_URL || '';

const EditProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    setSuccess('');

    const fd = new FormData();
    if (values.username && values.username !== user.username) {
      fd.append('username', values.username);
    }
    if (fileInputRef.current?.files?.[0]) {
      fd.append('avatar', fileInputRef.current.files[0]);
    }

    const wantsPasswordChange = !!(values.currentPassword && values.newPassword);

    if (![...fd.entries()].length && !wantsPasswordChange) {
      setSuccess('No changes to save');
      setIsLoading(false);
      return;
    }

    try {
      if ([...fd.entries()].length) {
        const data = await userApi.updateProfile(user._id, fd);
        updateUser(data.user);
      }

      if (wantsPasswordChange) {
        await userApi.changePassword(user._id, values.currentPassword!, values.newPassword!);
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => navigate(`/profile/${user._id}`), 1200);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page">
      <Navbar />
      <main className="main-content">
        <div className="form-page-container">
          <button className="btn btn-ghost btn-sm back-btn" onClick={() => navigate(-1)}>
            &larr; Back
          </button>
          <h2 className="page-title">Edit Profile</h2>

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
                  Change photo
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                {...register('username')}
                type="text"
                className={`form-input ${errors.username ? 'input-error' : ''}`}
                placeholder="Your username"
              />
              {errors.username && <span className="error-msg">{errors.username.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={user?.email}
                disabled
                style={{ opacity: 0.6 }}
              />
              <span className="form-hint">Email cannot be changed</span>
            </div>

            <hr style={{ margin: '1.5rem 0' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Change Password</h3>
            <span className="form-hint" style={{ display: 'block', marginBottom: '1rem' }}>
              Leave blank to keep your current password
            </span>

            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                {...register('currentPassword')}
                type="password"
                className={`form-input ${errors.currentPassword ? 'input-error' : ''}`}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
              {errors.currentPassword && (
                <span className="error-msg">{errors.currentPassword.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                {...register('newPassword')}
                type="password"
                className={`form-input ${errors.newPassword ? 'input-error' : ''}`}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
              {errors.newPassword && (
                <span className="error-msg">{errors.newPassword.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                {...register('confirmPassword')}
                type="password"
                className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <span className="error-msg">{errors.confirmPassword.message}</span>
              )}
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default EditProfilePage;
