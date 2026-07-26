import { Router } from 'express';
import adminAuth from '../../middleware/admin/adminAuth.js';
import adminRole from '../../middleware/admin/adminRole.js';
import { getPaymentMethods, getPaymentMethodById, createPaymentMethod, updatePaymentMethod, deletePaymentMethod, togglePaymentMethod } from '../../controllers/admin/paymentMethodController.js';

const router = Router();

router.get('/payment-methods', adminAuth, getPaymentMethods);
router.get('/payment-methods/:id', adminAuth, getPaymentMethodById);
router.post('/payment-methods', adminAuth, adminRole('super_admin'), createPaymentMethod);
router.patch('/payment-methods/:id', adminAuth, adminRole('super_admin'), updatePaymentMethod);
router.delete('/payment-methods/:id', adminAuth, adminRole('super_admin'), deletePaymentMethod);
router.post('/payment-methods/:id/toggle', adminAuth, adminRole('super_admin'), togglePaymentMethod);

export default router;