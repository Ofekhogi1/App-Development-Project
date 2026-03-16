import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LoginPage from '../LoginPage';
import { authApi } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../api/auth.api', () => ({
  authApi: {
    login: vi.fn(),
  },
}));

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockUser = {
  _id: '1',
  username: 'testuser',
  email: 'test@example.com',
  avatarUrl: null,
  createdAt: new Date().toISOString(),
  isProfileComplete: true,
};

const renderLogin = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );

const makeAxiosError = (message: string, status = 401) => ({
  response: { status, data: { message } },
});

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({
    login: mockLogin,
    user: null,
    isLoading: false,
    isAuthenticated: false,
    updateUser: vi.fn(),
    logout: vi.fn(),
  });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  describe('Rendering', () => {
    it('renders all form elements', () => {
      renderLogin();

      expect(screen.getByText('Welcome back')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your username or email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
    });
  });

  describe('Client-side validation', () => {
    it('shows required errors when submitting empty form', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByText('Username or email is required')).toBeInTheDocument();
      expect(await screen.findByText('Password is required')).toBeInTheDocument();
    });

    it('shows error when identifier is empty', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(screen.getByPlaceholderText('Enter your password'), 'somepassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByText('Username or email is required')).toBeInTheDocument();
    });

    it('shows error when password is empty', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(screen.getByPlaceholderText('Enter your username or email'), 'testuser');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByText('Password is required')).toBeInTheDocument();
    });
  });

  describe('Successful login', () => {
    it('calls authApi.login with correct credentials and navigates to /', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockResolvedValue({ accessToken: 'tok123', user: mockUser });
      renderLogin();

      await user.type(screen.getByPlaceholderText('Enter your username or email'), 'testuser');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalledWith({
          identifier: 'testuser',
          password: 'password123',
          rememberMe: false,
        });
        expect(mockLogin).toHaveBeenCalledWith('tok123', mockUser);
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('sends rememberMe: true when checkbox is checked', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockResolvedValue({ accessToken: 'tok123', user: mockUser });
      renderLogin();

      await user.type(screen.getByPlaceholderText('Enter your username or email'), 'testuser');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await user.click(screen.getByRole('checkbox', { name: /remember me/i }));
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalledWith({
          identifier: 'testuser',
          password: 'password123',
          rememberMe: true,
        });
      });
    });

    it('can log in with email instead of username', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockResolvedValue({ accessToken: 'tok123', user: mockUser });
      renderLogin();

      await user.type(screen.getByPlaceholderText('Enter your username or email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalledWith(
          expect.objectContaining({ identifier: 'test@example.com' })
        );
      });
    });
  });

  describe('Error handling', () => {
    it('shows "Invalid credentials" from server on wrong password — not "No refresh token"', async () => {
      // This is the key regression test for the bug where the axios interceptor
      // was catching the 401 from /auth/login and replacing it with the refresh error.
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockRejectedValue(makeAxiosError('Invalid credentials', 401));
      renderLogin();

      await user.type(screen.getByPlaceholderText('Enter your username or email'), 'testuser');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
      expect(screen.queryByText('No refresh token')).not.toBeInTheDocument();
    });

    it('shows server error message when user is not found', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockRejectedValue(makeAxiosError('Invalid credentials', 401));
      renderLogin();

      await user.type(screen.getByPlaceholderText('Enter your username or email'), 'nobody');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    });

    it('shows fallback message on network error (no response object)', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockRejectedValue(new Error('Network Error'));
      renderLogin();

      await user.type(screen.getByPlaceholderText('Enter your username or email'), 'testuser');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByText('Login failed. Please try again.')).toBeInTheDocument();
    });

    it('does not navigate when login fails', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login).mockRejectedValue(makeAxiosError('Invalid credentials'));
      renderLogin();

      await user.type(screen.getByPlaceholderText('Enter your username or email'), 'testuser');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'wrong');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await screen.findByText('Invalid credentials');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('clears previous server error on new submission', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.login)
        .mockRejectedValueOnce(makeAxiosError('Invalid credentials'))
        .mockResolvedValueOnce({ accessToken: 'tok', user: mockUser });
      renderLogin();

      await user.type(screen.getByPlaceholderText('Enter your username or email'), 'testuser');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'wrong');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();

      await user.clear(screen.getByPlaceholderText('Enter your password'));
      await user.type(screen.getByPlaceholderText('Enter your password'), 'correctpass');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
      });
    });
  });

  describe('Submit button states', () => {
    it('shows "Signing in..." while the request is pending', async () => {
      const user = userEvent.setup();
      let resolveLogin!: (v: unknown) => void;
      vi.mocked(authApi.login).mockReturnValue(new Promise((r) => (resolveLogin = r)));
      renderLogin();

      await user.type(screen.getByPlaceholderText('Enter your username or email'), 'testuser');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByRole('button', { name: /signing in/i })).toBeDisabled();

      resolveLogin({ accessToken: 'tok', user: mockUser });
      expect(await screen.findByRole('button', { name: /sign in/i })).not.toBeDisabled();
    });
  });
});
