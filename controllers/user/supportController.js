import SupportTicket from '../../models/admin/SupportTicket.js';
import { success, created } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';

// GET /api/support/tickets
const getTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .select('ticketId subject category status updatedAt');
    return success(res, tickets, 'Tickets');
  } catch (error) { next(error); }
};

// GET /api/support/tickets/:id
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findOne({ _id: req.params.id, user: req.user._id });
    if (!ticket) throw new AppError('Ticket not found', 404, 'NOT_FOUND');
    return success(res, ticket, 'Ticket detail');
  } catch (error) { next(error); }
};

// POST /api/support/tickets
const createTicket = async (req, res, next) => {
  try {
    const { subject, category, message } = req.body;
    if (!subject || !message) throw new AppError('Subject and message required', 400, 'MISSING_FIELDS');

    const count = await SupportTicket.countDocuments();
    const ticketId = `TKT-${String(count + 1).padStart(6, '0')}`;

    const ticket = await SupportTicket.create({
      ticketId,
      user: req.user._id,
      subject,
      category: category || 'general',
      messages: [{ sender: req.user._id, senderType: 'user', message, createdAt: new Date() }],
      status: 'open',
    });

    return created(res, ticket, 'Ticket created');
  } catch (error) { next(error); }
};

// POST /api/support/tickets/:id/respond
const respondToTicket = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) throw new AppError('Message required', 400, 'MISSING_MESSAGE');

    const ticket = await SupportTicket.findOne({ _id: req.params.id, user: req.user._id });
    if (!ticket) throw new AppError('Ticket not found', 404, 'NOT_FOUND');
    if (ticket.status === 'closed') throw new AppError('Ticket is closed', 400, 'TICKET_CLOSED');

    ticket.messages.push({ sender: req.user._id, senderType: 'user', message, createdAt: new Date() });
    if (ticket.status === 'resolved') ticket.status = 'open';
    await ticket.save();

    return success(res, ticket, 'Reply sent');
  } catch (error) { next(error); }
};

export { getTickets, getTicketById, createTicket, respondToTicket };