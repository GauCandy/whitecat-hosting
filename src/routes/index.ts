import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import serverRoutes from './server.routes';
import contactRoutes from './contact.routes';
import { authController } from '../controllers/auth.controller';

const router = Router();

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'WhiteCat Hosting',
        timestamp: new Date().toISOString()
    });
});

// Auth routes
router.use('/auth', authRoutes);

// API routes
router.get('/api/user', authController.getCurrentUser);
router.use('/api/user', userRoutes);
router.use('/api/configs', serverRoutes);
router.use('/api/contact', contactRoutes);

export default router;
