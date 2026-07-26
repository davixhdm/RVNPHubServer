import { Router } from 'express';
import adminAuth from '../../middleware/admin/adminAuth.js';
import adminRole from '../../middleware/admin/adminRole.js';
import { getPayments, getPaymentById, verifyPayment, refundPayment, getTransactions, getRevenue } from '../../controllers/admin/paymentController.js';

const router = Router();

router.get('/payments', adminAuth, adminRole('super_admin'), getPayments);
router.get('/payments/:id', adminAuth, adminRole('super_admin'), getPaymentById);
router.post('/payments/:id/verify', adminAuth, adminRole('super_admin'), verifyPayment);
router.post('/payments/:id/refund', adminAuth, adminRole('super_admin'), refundPayment);
router.get('/payments/transactions', adminAuth, adminRole('super_admin'), getTransactions);
router.get('/payments/revenue', adminAuth, adminRole('super_admin'), getRevenue);

export default router;