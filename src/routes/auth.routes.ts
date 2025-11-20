import { Router } from 'express';
import { authController } from '../controllers/auth.controller';

const router = Router();

router.get('/discord', authController.login);
router.get('/discord/callback', authController.callback);
router.post('/logout', authController.logout);

export default router;
