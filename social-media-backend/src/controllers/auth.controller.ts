import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/user.model';
import { RefreshToken } from '../models/refreshToken.model';
import { hashToken } from '../services/auth.service';
import {
  generateAccessToken,
  generateRawRefreshToken,
  saveRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  getRefreshTokenCookieOptions,
} from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { env } from '../config/env';

const REFRESH_TOKEN_COOKIE = 'refreshToken';

const sanitizeUser = (user: IUser) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt,
  isProfileComplete: user.isProfileComplete,
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: Username or email already taken
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password } = req.body as {
    username: string;
    email: string;
    password: string;
  };

  if (!username || !email || !password) {
    res.status(400).json({ message: 'Username, email and password are required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ message: 'Password must be at least 6 characters' });
    return;
  }

  const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
  if (existing) {
    const field = existing.email === email.toLowerCase() ? 'Email' : 'Username';
    res.status(409).json({ message: `${field} is already taken` });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ username, email: email.toLowerCase(), passwordHash });

  const accessToken = generateAccessToken(user._id.toString(), user.username);
  const rawRefreshToken = generateRawRefreshToken();
  await saveRefreshToken(user._id.toString(), rawRefreshToken, false);

  res.cookie(REFRESH_TOKEN_COOKIE, rawRefreshToken, getRefreshTokenCookieOptions(false));
  res.status(201).json({ accessToken, user: sanitizeUser(user) });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with username/email and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Username or email
 *               password:
 *                 type: string
 *               rememberMe:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { identifier, password, rememberMe = false } = req.body as {
    identifier: string;
    password: string;
    rememberMe?: boolean;
  };

  if (!identifier || !password) {
    res.status(400).json({ message: 'Identifier and password are required' });
    return;
  }

  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
  }).select('+passwordHash');

  if (!user || !user.passwordHash) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const accessToken = generateAccessToken(user._id.toString(), user.username);
  const rawRefreshToken = generateRawRefreshToken();
  await saveRefreshToken(user._id.toString(), rawRefreshToken, rememberMe);

  res.cookie(REFRESH_TOKEN_COOKIE, rawRefreshToken, getRefreshTokenCookieOptions(rememberMe));
  res.json({ accessToken, user: sanitizeUser(user) });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh cookie
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Invalid or expired refresh token
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;

  if (!rawRefreshToken) {
    res.status(401).json({ message: 'No refresh token' });
    return;
  }

  const result = await rotateRefreshToken(rawRefreshToken);
  if (!result) {
    res.clearCookie(REFRESH_TOKEN_COOKIE);
    res.status(401).json({ message: 'Invalid or expired refresh token' });
    return;
  }

  const { newRawToken, rememberMe } = result;

  // Find the user from the new token's DB entry to build access token
  const stored = await RefreshToken.findOne({ token: hashToken(newRawToken) }).populate<{
    user: IUser;
  }>('user');

  if (!stored || !stored.user) {
    res.status(401).json({ message: 'Refresh failed' });
    return;
  }

  const user = stored.user;
  const accessToken = generateAccessToken(user._id.toString(), user.username);

  res.cookie(REFRESH_TOKEN_COOKIE, newRawToken, getRefreshTokenCookieOptions(rememberMe));
  res.json({ accessToken, user: sanitizeUser(user) });
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout - revoke refresh token
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;

  if (rawRefreshToken) {
    await revokeRefreshToken(rawRefreshToken);
  }

  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'strict',
  });

  res.json({ message: 'Logged out successfully' });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *       401:
 *         description: Unauthorized
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: sanitizeUser(req.user as IUser) });
});

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback (handled by Passport)
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       302:
 *         description: Redirect to frontend with access token
 */
export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as IUser;

  const accessToken = generateAccessToken(user._id.toString(), user.username);
  const rawRefreshToken = generateRawRefreshToken();
  await saveRefreshToken(user._id.toString(), rawRefreshToken, true);

  res.cookie(REFRESH_TOKEN_COOKIE, rawRefreshToken, getRefreshTokenCookieOptions(true));
  res.redirect(`${env.CLIENT_URL}/oauth/callback#token=${accessToken}`);
});
