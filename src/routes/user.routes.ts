import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.get('/balance', userController.getBalance);
router.post('/deposit', userController.deposit);
router.get('/transactions', userController.getTransactions);
router.get('/servers', userController.getServers);
router.post('/servers', userController.purchaseServer);
router.post('/servers/:id/extend', userController.extendServer);

export default router;
