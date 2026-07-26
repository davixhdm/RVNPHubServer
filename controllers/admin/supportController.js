import SupportTicket from '../../models/admin/SupportTicket.js';
import User from '../../models/user/User.js';
import * as emailService from '../../services/emailService.js';
import * as smsService from '../../services/smsService.js';
import * as pushService from '../../services/pushService.js';
import * as socketService from '../../services/socketService.js';
import { success } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';
import paginate from '../../utils/paginate.js';

// GET /api/admin/support/tickets
const getTickets = async (req, res, next) => {
  try {
    const { status, category, priority, page, limit } = req.query;
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    const result = await paginate(SupportTicket, query, {
      page, limit: limit || 20,
      sort: { updatedAt: -1 },
      populate: 'user assignedTo',
    });

    return success(res, result.data, 'Support tickets', 200, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/support/tickets/:id
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).populate('user assignedTo');
    if (!ticket) throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
    return success(res, ticket, 'Ticket details');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/support/tickets/:id/respond
const respondToTicket = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) throw new AppError('Response message is required', 400, 'MISSING_MESSAGE');

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');

    ticket.messages.push({ sender: req.admin._id, senderType: 'admin', message, createdAt: new Date() });
    ticket.status = 'in_progress';
    if (!ticket.assignedTo) ticket.assignedTo = req.admin._id;
    await ticket.save();

    const user = await User.findById(ticket.user);
    if (user) {
      await emailService.sendTicketResponseEmail(user, ticket.ticketId, message);
      if (user.phone) await smsService.sendTicketResponseSMS(user.phone, ticket.ticketId);
      await pushService.sendToUser(user._id, { title: 'Support Response', body: `Ticket #${ticket.ticketId} has a new response`, data: { type: 'support', ticketId: ticket._id } });
      socketService.emitToUser(user._id, 'support:response', { ticketId: ticket._id, message });
    }

    return success(res, ticket, 'Response sent');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/support/tickets/:id/status
const updateTicketStatus = async (req, res, next) => {
  try {
    const { status, resolution } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');

    ticket.status = status;
    if (resolution) ticket.resolution = resolution;
    await ticket.save();

    const user = await User.findById(ticket.user);
    if (user && status === 'resolved') {
      await emailService.sendTicketResolvedEmail(user, ticket.ticketId);
      await pushService.sendToUser(user._id, { title: 'Ticket Resolved', body: `Ticket #${ticket.ticketId} has been resolved`, data: { type: 'support', ticketId: ticket._id } });
      socketService.emitToUser(user._id, 'support:resolved', { ticketId: ticket._id });
    }

    return success(res, ticket, `Ticket status updated to ${status}`);
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/support/tickets/:id/assign
const assignTicket = async (req, res, next) => {
  try {
    const { adminId } = req.body;
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { assignedTo: adminId }, { new: true });
    if (!ticket) throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
    return success(res, ticket, 'Ticket assigned');
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/support/tickets/:id/note
const addInternalNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');

    ticket.internalNotes.push({ adminId: req.admin._id, note, createdAt: new Date() });
    await ticket.save();

    return success(res, ticket, 'Internal note added');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/support/analytics
const getSupportAnalytics = async (req, res, next) => {
  try {
    const [open, inProgress, resolved, closed, total] = await Promise.all([
      SupportTicket.countDocuments({ status: 'open' }),
      SupportTicket.countDocuments({ status: 'in_progress' }),
      SupportTicket.countDocuments({ status: 'resolved' }),
      SupportTicket.countDocuments({ status: 'closed' }),
      SupportTicket.countDocuments(),
    ]);

    return success(res, { open, inProgress, resolved, closed, total }, 'Support analytics');
  } catch (error) {
    next(error);
  }
};

export { getTickets, getTicketById, respondToTicket, updateTicketStatus, assignTicket, addInternalNote, getSupportAnalytics };