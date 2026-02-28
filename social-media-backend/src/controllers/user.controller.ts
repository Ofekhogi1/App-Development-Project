import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/user.model';
import { Post } from '../models/post.model';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user profile with their posts
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: User profile and their posts
 *       404:
 *         description: User not found
 */
export const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).select('-passwordHash -googleId');
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const cursor = req.query.cursor as string | undefined;

  let postFilter: Record<string, unknown> = { author: user._id };
  if (cursor) {
    const [ts, id] = cursor.split('_');
    postFilter = {
      author: user._id,
      $or: [
        { createdAt: { $lt: new Date(ts) } },
        { createdAt: new Date(ts), _id: { $lt: id } },
      ],
    };
  }

  const posts = await Post.find(postFilter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate('author', 'username avatarUrl');

  const hasMore = posts.length > limit;
  if (hasMore) posts.pop();

  const nextCursor =
    hasMore && posts.length > 0
      ? `${posts[posts.length - 1].createdAt.toISOString()}_${posts[posts.length - 1]._id}`
      : null;

  res.json({ user, posts, nextCursor, hasMore });
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update own profile (username and/or avatar)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated
 *       403:
 *         description: Not authorized
 *       409:
 *         description: Username already taken
 */
export const updateUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = req.user as IUser;

  if (currentUser._id.toString() !== req.params.id) {
    // If a file was uploaded for unauthorized request, clean it up
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(403).json({ message: 'Not authorized to edit this profile' });
    return;
  }

  const updates: { username?: string; avatarUrl?: string; isProfileComplete?: boolean } = {};

  if (req.body.username && req.body.username !== currentUser.username) {
    const uname: string = req.body.username;
    if (uname.length < 3 || uname.length > 30 || !/^[a-zA-Z0-9_]+$/.test(uname)) {
      if (req.file) fs.unlink(req.file.path, () => {});
      res.status(400).json({ message: 'Username must be 3-30 characters (letters, numbers, underscores only)' });
      return;
    }
    const exists = await User.findOne({ username: uname });
    if (exists) {
      if (req.file) fs.unlink(req.file.path, () => {});
      res.status(409).json({ message: 'Username already taken' });
      return;
    }
    updates.username = uname;
  }

  if (req.file) {
    // Delete old avatar if it's a local file
    if (currentUser.avatarUrl && currentUser.avatarUrl.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '../../', currentUser.avatarUrl);
      fs.unlink(oldPath, () => {});
    }
    updates.avatarUrl = `/uploads/avatars/${req.file.filename}`;
  }

  updates.isProfileComplete = true;

  const updatedUser = await User.findByIdAndUpdate(
    currentUser._id,
    { $set: updates },
    { new: true, select: '-passwordHash -googleId' }
  );

  res.json({ user: updatedUser });
});

/**
 * @swagger
 * /api/users/{id}/password:
 *   put:
 *     summary: Change own password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password updated
 *       400:
 *         description: Invalid input or Google account
 *       401:
 *         description: Current password is incorrect
 *       403:
 *         description: Not authorized
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const currentUser = req.user as IUser;

  if (currentUser._id.toString() !== req.params.id) {
    res.status(403).json({ message: 'Not authorized to change this password' });
    return;
  }

  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ message: 'New password must be at least 6 characters' });
    return;
  }

  const user = await User.findById(currentUser._id).select('+passwordHash');
  if (!user || !user.passwordHash) {
    res.status(400).json({ message: 'Password change not available for Google accounts' });
    return;
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    res.status(401).json({ message: 'Current password is incorrect' });
    return;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.json({ message: 'Password updated successfully' });
});
