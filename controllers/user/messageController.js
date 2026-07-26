import Message from '../../models/user/Message.js';
import Chat from '../../models/user/Chat.js';
import * as socketService from '../../services/socketService.js';
import paginate from '../../utils/paginate.js';
import { success, created } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import getSettings from '../../utils/getSettings.js';
import logger from '../../utils/logger.js';

// GET /api/chats/:chatId/messages
const getMessages = async (req, res, next) => {
  try {
    const result = await paginate(
      Message,
      { chat: req.params.chatId, deletedAt: null },
      { page: req.query.page, limit: 30, sort: { createdAt: -1 } }
    );
    return success(res, result.data.reverse(), 'Messages', 200, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

// POST /api/chats/:chatId/messages
const sendMessage = async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings?.toggles?.chat) throw new AppError('Chat is disabled', 403, 'CHAT_DISABLED');

    const chat = await Chat.findOne({ _id: req.params.chatId, participants: req.user._id });
    if (!chat) throw new AppError('Chat not found', 404, 'NOT_FOUND');

    // Decode URL if it has HTML entities
    const fileUrl = req.body.fileUrl
      ? req.body.fileUrl.replace(/&#x2F;/g, '/').replace(/&amp;/g, '&')
      : null;

    const message = await Message.create({
      chat: req.params.chatId,
      sender: req.user._id,
      content: req.body.content || '',
      type: req.body.type || 'text',
      fileUrl,
      fileName: req.body.fileName || null,
      poll: req.body.poll || null,
      readBy: [req.user._id],
    });

    chat.lastMessage = {
      sender: req.user._id,
      content: req.body.type === 'image' ? '📷 Image' : 
               req.body.type === 'file' ? '📎 File' : 
               (req.body.content?.substring(0, 100) || ''),
      type: req.body.type || 'text',
      createdAt: new Date(),
    };

    // Increment unread count for all other participants
    const unreadCount = { ...chat.unreadCount };
    chat.participants.forEach(p => {
      const pid = p.toString();
      if (pid !== req.user._id.toString()) {
        unreadCount[pid] = (unreadCount[pid] || 0) + 1;
      }
    });
    chat.unreadCount = unreadCount;
    await chat.save();

    socketService.newMessage(req.params.chatId, message);
    chat.participants.forEach(p => {
      if (p.toString() !== req.user._id.toString()) {
        socketService.emitToUser(p, 'chat:newMessage', message);
      }
    });

    return created(res, message, 'Message sent');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/messages/:id
const editMessage = async (req, res, next) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, sender: req.user._id },
      { content: req.body.content, editedAt: new Date() },
      { new: true }
    );
    if (!message) throw new AppError('Message not found', 404, 'NOT_FOUND');
    socketService.emitToChat(message.chat, 'chat:messageEdited', message);
    return success(res, message, 'Message edited');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/messages/:id
const deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, sender: req.user._id },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!message) throw new AppError('Message not found', 404, 'NOT_FOUND');
    socketService.emitToChat(message.chat, 'chat:messageDeleted', { messageId: message._id });
    return success(res, null, 'Message deleted');
  } catch (error) {
    next(error);
  }
};

// POST /api/chats/:chatId/read
const markAsRead = async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) throw new AppError('Chat not found', 404, 'NOT_FOUND');

    // Clear unread for this user
    const unreadCount = { ...chat.unreadCount };
    unreadCount[req.user._id.toString()] = 0;
    chat.unreadCount = unreadCount;

    // Mark all messages as read by this user
    await Message.updateMany(
      { chat: req.params.chatId, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { $push: { readBy: req.user._id } }
    );

    await chat.save();
    socketService.messageRead(req.params.chatId, null, req.user._id);
    return success(res, null, 'Marked as read');
  } catch (error) {
    next(error);
  }
};

// POST /api/chats/:chatId/poll
const createPoll = async (req, res, next) => {
  try {
    const message = await Message.create({
      chat: req.params.chatId,
      sender: req.user._id,
      type: 'poll',
      poll: {
        question: req.body.question,
        options: req.body.options.map(o => ({ text: o, votes: [] })),
      },
    });
    socketService.newMessage(req.params.chatId, message);
    return created(res, message, 'Poll created');
  } catch (error) {
    next(error);
  }
};

// POST /api/messages/:id/poll/vote
const votePoll = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message || message.type !== 'poll') throw new AppError('Poll not found', 404, 'NOT_FOUND');
    const option = message.poll.options[req.body.optionIndex];
    if (!option) throw new AppError('Invalid option', 400, 'INVALID_OPTION');
    if (!option.votes.includes(req.user._id)) {
      option.votes.push(req.user._id);
      await message.save();
    }
    socketService.emitToChat(message.chat, 'chat:pollVoted', message);
    return success(res, message, 'Vote recorded');
  } catch (error) {
    next(error);
  }
};

export { getMessages, sendMessage, editMessage, deleteMessage, markAsRead, createPoll, votePoll };