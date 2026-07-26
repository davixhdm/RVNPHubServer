import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import validateObjectId from '../../middleware/user/validateObjectId.js';
import sanitizeBody from '../../middleware/user/sanitizeBody.js';
import {
  getTickets, getTicketById, createTicket, respondToTicket,
} from '../../controllers/user/supportController.js';

const router = Router();

router.get('/support/tickets', auth(), getTickets);
router.get('/support/tickets/:id', auth(), validateObjectId('id'), getTicketById);
router.post('/support/tickets', auth(), sanitizeBody, createTicket);
router.post('/support/tickets/:id/respond', auth(), validateObjectId('id'), respondToTicket);

export default router;