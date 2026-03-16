import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import RegisterPage from '../RegisterPage';
import { authApi } from '../../api/auth.api';
import type { AuthResponse } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../api/auth.api', () => ({
  authApi: {
    register: vi.fn(),
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
  username: 'newuser',
  email: 'new@example.com',
  avatarUrl: null,
  createdAt: new Date().toISOString(),
  isProfileComplete: true,
};

const renderRegister = () =>
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  );

const makeAxiosError = (message: string, status = 409) => ({
  response: { status, data: { message } },
});

const fillValidForm = async (
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<{
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }> = {}
) => {
  const values = {
    username: 'newuser',
    email: 'new@example.com',
    password: 'secret123',
    confirmPassword: 'secret123',
    ...overrides,
  };
  await user.type(screen.getByPlaceholderText('Choose a username'), values.username);
  await user.type(screen.getByPlaceholderText('Enter your email'), values.email);
  const [passwordInput, confirmInput] = screen.getAllByPlaceholderText(/password/i);
  await user.type(passwordInput, values.password);
  await user.type(confirmInput, values.confirmPassword);
};

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

describe('RegisterPage', () => {
  describe('Rendering', () => {
    it('renders all form elements', () => {
      renderRegister();

      expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Choose a username')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Choose a password (min 6 chars)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Repeat your password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  describe('Client-side validation', () => {
    it('shows all required errors on empty submit', async () => {
      const user = userEvent.setup();
      renderRegister();

      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText('Username must be at least 3 characters')).toBeInTheDocument();
      expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
      expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();
    });

    it('shows error when username is too short', async () => {
      const user = userEvent.setup();
      renderRegister();

      await user.type(screen.getByPlaceholderText('Choose a username'), 'ab');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText('Username must be at least 3 characters')).toBeInTheDocument();
    });

    it('shows error when username is too long', async () => {
      const user = userEvent.setup();
      renderRegister();

      await user.type(screen.getByPlaceholderText('Choose a username'), 'a'.repeat(31));
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText('Username max 30 characters')).toBeInTheDocument();
    });

    it('shows error when username contains invalid characters', async () => {
      const user = userEvent.setup();
      renderRegister();

      await user.type(screen.getByPlaceholderText('Choose a username'), 'user@name!');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(
        await screen.findByText('Username can only contain letters, numbers and underscores')
      ).toBeInTheDocument();
    });

    it('allows underscores and numbers in username', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.register).mockResolvedValue({ accessToken: 'tok', user: mockUser });
      renderRegister();

      await fillValidForm(user, { username: 'user_123' });
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => expect(authApi.register).toHaveBeenCalled());
      expect(
        screen.queryByText('Username can only contain letters, numbers and underscores')
      ).not.toBeInTheDocument();
    });

    it('shows error when email is invalid', async () => {
      const user = userEvent.setup();
      renderRegister();

      await user.type(screen.getByPlaceholderText('Enter your email'), 'notanemail');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
    });

    it('shows error when password is too short', async () => {
      const user = userEvent.setup();
      renderRegister();

      const [passwordInput] = screen.getAllByPlaceholderText(/password/i);
      await user.type(passwordInput, 'abc');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();
    });

    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup();
      renderRegister();

      await fillValidForm(user, { password: 'password123', confirmPassword: 'different456' });
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText("Passwords don't match")).toBeInTheDocument();
    });

    it('does not show password mismatch when passwords match', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.register).mockResolvedValue({ accessToken: 'tok', user: mockUser });
      renderRegister();

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => expect(authApi.register).toHaveBeenCalled());
      expect(screen.queryByText("Passwords don't match")).not.toBeInTheDocument();
    });
  });

  describe('Successful registration', () => {
    it('calls authApi.register with correct data and navigates to /', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.register).mockResolvedValue({ accessToken: 'tok123', user: mockUser });
      renderRegister();

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(authApi.register).toHaveBeenCalledWith({
          username: 'newuser',
          email: 'new@example.com',
          password: 'secret123',
        });
        expect(mockLogin).toHaveBeenCalledWith('tok123', mockUser);
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('does not send confirmPassword to the API', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.register).mockResolvedValue({ accessToken: 'tok', user: mockUser });
      renderRegister();

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() =>
        expect(authApi.register).toHaveBeenCalledWith(
          expect.not.objectContaining({ confirmPassword: expect.anything() })
        )
      );
    });
  });

  describe('Error handling', () => {
    it('shows "Email is already taken" from server', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.register).mockRejectedValue(makeAxiosError('Email is already taken', 409));
      renderRegister();

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText('Email is already taken')).toBeInTheDocument();
    });

    it('shows "Username is already taken" from server', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.register).mockRejectedValue(
        makeAxiosError('Username is already taken', 409)
      );
      renderRegister();

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText('Username is already taken')).toBeInTheDocument();
    });

    it('shows fallback message on network error', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.register).mockRejectedValue(new Error('Network Error'));
      renderRegister();

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText('Registration failed. Please try again.')).toBeInTheDocument();
    });

    it('does not navigate when registration fails', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.register).mockRejectedValue(makeAxiosError('Email is already taken'));
      renderRegister();

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await screen.findByText('Email is already taken');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('clears previous server error on new submission attempt', async () => {
      const user = userEvent.setup();
      vi.mocked(authApi.register)
        .mockRejectedValueOnce(makeAxiosError('Email is already taken'))
        .mockResolvedValueOnce({ accessToken: 'tok', user: mockUser });
      renderRegister();

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /create account/i }));
      expect(await screen.findByText('Email is already taken')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.queryByText('Email is already taken')).not.toBeInTheDocument();
      });
    });
  });

  describe('Submit button states', () => {
    it('shows "Creating account..." while the request is pending', async () => {
      const user = userEvent.setup();
      let resolveRegister!: (value: AuthResponse | PromiseLike<AuthResponse>) => void;
      vi.mocked(authApi.register).mockReturnValue(
        new Promise((r) => (resolveRegister = r))
      );
      renderRegister();

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByRole('button', { name: /creating account/i })).toBeDisabled();

      resolveRegister({ accessToken: 'tok', user: mockUser });
      expect(await screen.findByRole('button', { name: /create account/i })).not.toBeDisabled();
    });
  });
});
