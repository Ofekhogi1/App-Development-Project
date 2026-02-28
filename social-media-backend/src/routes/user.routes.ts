import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadAvatar } from '../middleware/upload.middleware';

const router = Router();

router.get('/:id', authenticate, userController.getUserProfile);
router.put('/:id', authenticate, uploadAvatar, userController.updateUserProfile);
router.put('/:id/password', authenticate, userController.changePassword);

export default router;
