import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { RefreshToken } from '../models/refreshToken.model';
import mongoose from 'mongoose';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const generateAccessToken = (userId: string, username: string): string => {
  return jwt.sign({ sub: userId, username }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const generateRawRefreshToken = (): string => {
  return crypto.randomBytes(40).toString('hex');
};

export const hashToken = (rawToken: string): string => {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

export const saveRefreshToken = async (
  userId: string,
  rawToken: string,
  rememberMe: boolean
): Promise<void> => {
  const hashedToken = hashToken(rawToken);
  const daysToExpire = rememberMe ? 30 : 7;
  const expiresAt = new Date(Date.now() + daysToExpire * MS_PER_DAY);

  await RefreshToken.create({
    token: hashedToken,
    user: new mongoose.Types.ObjectId(userId),
    expiresAt,
  });
};

export const rotateRefreshToken = async (
  rawToken: string
): Promise<{ newRawToken: string; rememberMe: boolean } | null> => {
  const hashedToken = hashToken(rawToken);
  const existing = await RefreshToken.findOne({ token: hashedToken });

  if (!existing) return null;

  // Reuse detection: if revoked, invalidate all tokens for this user
  if (existing.revoked) {
    await RefreshToken.updateMany({ user: existing.user }, { revoked: true });
    return null;
  }

  if (existing.expiresAt < new Date()) return null;

  // Revoke current token
  existing.revoked = true;
  await existing.save();

  const daysRemaining = Math.ceil(
    (existing.expiresAt.getTime() - Date.now()) / MS_PER_DAY
  );
  const rememberMe = daysRemaining > 7;

  const newRawToken = generateRawRefreshToken();
  await saveRefreshToken(existing.user.toString(), newRawToken, rememberMe);

  return { newRawToken, rememberMe };
};

export const revokeRefreshToken = async (rawToken: string): Promise<void> => {
  const hashedToken = hashToken(rawToken);
  await RefreshToken.findOneAndUpdate({ token: hashedToken }, { revoked: true });
};

export const getRefreshTokenCookieOptions = (rememberMe: boolean) => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'strict' as const,
  domain: env.isProd ? env.COOKIE_DOMAIN : undefined,
  maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
});
