declare global {
  namespace Express {
    interface User {
      _id: import('mongoose').Types.ObjectId;
      username: string;
      email: string;
      passwordHash?: string;
      googleId?: string;
      avatarUrl?: string | null;
      createdAt: Date;
      updatedAt: Date;
      comparePassword(candidatePassword: string): Promise<boolean>;
    }
  }
}
