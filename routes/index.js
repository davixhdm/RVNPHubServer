import { Router } from 'express';
import publicRoutes from './public/index.js';
import adminRoutes from './admin/index.js';
import userRoutes from './user/index.js';

const router = Router();

router.use(publicRoutes);
router.use(userRoutes);
router.use('/admin', adminRoutes);

export default router;