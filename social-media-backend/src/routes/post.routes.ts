import { Router } from 'express';
import * as postController from '../controllers/post.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadPostImage } from '../middleware/upload.middleware';

const router = Router();

router.get('/', authenticate, postController.getFeed);
router.post('/', authenticate, uploadPostImage, postController.createPost);
router.get('/:id', authenticate, postController.getPost);
router.put('/:id', authenticate, uploadPostImage, postController.updatePost);
router.delete('/:id', authenticate, postController.deletePost);

export default router;
