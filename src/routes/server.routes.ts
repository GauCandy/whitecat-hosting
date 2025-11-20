import { Router } from 'express';
import { serverController } from '../controllers/server.controller';

const router = Router();

router.get('/', serverController.getAllConfigs);
router.get('/:id', serverController.getConfig);

export default router;
