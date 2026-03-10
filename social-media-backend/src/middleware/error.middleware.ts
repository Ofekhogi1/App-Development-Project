import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: Error & { statusCode?: number; code?: number | string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error(err);

  // Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
      return;
    }
    res.status(400).json({ message: err.message });
    return;
  }

  // Mongoose duplicate key error
  if (err.code === 11000 || String(err.code) === '11000') {
    res.status(409).json({ message: 'A resource with that value already exists' });
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    res.status(400).json({ message: err.message });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({ message });
};

export const notFound = (_req: Request, res: Response): void => {
  res.status(404).json({ message: 'Route not found' });
};
