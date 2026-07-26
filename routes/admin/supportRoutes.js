import { Router } from 'express';
import adminAuth from '../../middleware/admin/adminAuth.js';
import adminRole from '../../middleware/admin/adminRole.js';
import { getTickets, getTicketById, respondToTicket, updateTicketStatus, assignTicket, addInternalNote, getSupportAnalytics } from '../../controllers/admin/supportController.js';

const router = Router();

router.get('/support/tickets', adminAuth, getTickets);
router.get('/support/tickets/:id', adminAuth, getTicketById);
router.post('/support/tickets/:id/respond', adminAuth, adminRole('super_admin', 'support_agent'), respondToTicket);
router.patch('/support/tickets/:id/status', adminAuth, adminRole('super_admin', 'support_agent'), updateTicketStatus);
router.post('/support/tickets/:id/assign', adminAuth, adminRole('super_admin'), assignTicket);
router.post('/support/tickets/:id/note', adminAuth, addInternalNote);
router.get('/support/analytics', adminAuth, getSupportAnalytics);

export default router;