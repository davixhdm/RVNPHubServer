import Chat from '../../models/user/Chat.js';
import User from '../../models/user/User.js';
import { generateRTMToken } from '../../config/agora.js';
import * as socketService from '../../services/socketService.js';
import { success, created } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import getSettings from '../../utils/getSettings.js';
import logger from '../../utils/logger.js';
import * as cloudinaryService from '../../services/cloudinaryService.js';

// GET /api/chats
const getChats = async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings?.toggles?.chat) throw new AppError('Chat is currently disabled', 403, 'CHAT_DISABLED');
    const chats = await Chat.find({ participants: req.user._id, isActive: true })
      .sort({ updatedAt: -1 })
      .populate('participants', 'firstName lastName avatar hdmVerified isOnline');
    return success(res, chats, 'Chats');
  } catch (error) {
    next(error);
  }
};

// GET /api/chats/:id
const getChatById = async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, participants: req.user._id })
      .populate('participants', 'firstName lastName avatar hdmVerified isOnline');
    if (!chat) throw new AppError('Chat not found', 404, 'NOT_FOUND');
    return success(res, chat, 'Chat detail');
  } catch (error) {
    next(error);
  }
};

// POST /api/chats/direct
const createDirectChat = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) throw new AppError('User ID required', 400, 'MISSING_USER');

    const existing = await Chat.findOne({
      type: 'direct',
      participants: { $all: [req.user._id, userId] },
    });
    if (existing) return success(res, existing, 'Chat exists');

    const chat = await Chat.create({
      type: 'direct',
      participants: [req.user._id, userId],
      agoraChannel: `rvnp_chat_${Date.now()}`,
    });

    const populated = await Chat.findById(chat._id)
      .populate('participants', 'firstName lastName avatar hdmVerified isOnline');

    return created(res, populated, 'Chat created');
  } catch (error) {
    next(error);
  }
};

// POST /api/chats/group
const createGroupChat = async (req, res, next) => {
  try {
    const { name, participants } = req.body;
    const allParticipants = [...new Set([req.user._id, ...participants])];
    const chat = await Chat.create({
      type: 'group',
      groupName: name,
      participants: allParticipants,
      agoraChannel: `rvnp_group_${Date.now()}`,
    });

    const populated = await Chat.findById(chat._id)
      .populate('participants', 'firstName lastName avatar hdmVerified isOnline');

    return created(res, populated, 'Group chat created');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/chats/:id
const updateGroupChat = async (req, res, next) => {
  try {
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, type: 'group', participants: req.user._id },
      { groupName: req.body.name, groupAvatar: req.body.avatar },
      { new: true }
    );
    if (!chat) throw new AppError('Chat not found', 404, 'NOT_FOUND');
    return success(res, chat, 'Chat updated');
  } catch (error) {
    next(error);
  }
};

// POST /api/chats/:id/participants
const addParticipant = async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) throw new AppError('Chat not found', 404, 'NOT_FOUND');
    if (!chat.participants.includes(req.body.userId)) {
      chat.participants.push(req.body.userId);
      await chat.save();
    }
    return success(res, chat, 'Participant added');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/chats/:id/participants/:userId
const removeParticipant = async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) throw new AppError('Chat not found', 404, 'NOT_FOUND');
    chat.participants = chat.participants.filter(p => p.toString() !== req.params.userId);
    await chat.save();
    return success(res, chat, 'Participant removed');
  } catch (error) {
    next(error);
  }
};

// POST /api/chats/:id/leave
const leaveChat = async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) throw new AppError('Chat not found', 404, 'NOT_FOUND');
    chat.participants = chat.participants.filter(p => p.toString() !== req.user._id.toString());
    if (chat.participants.length === 0) chat.isActive = false;
    await chat.save();
    return success(res, null, 'Left chat');
  } catch (error) {
    next(error);
  }
};

// POST /api/chats/:id/pin
const pinChat = async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, participants: req.user._id });
    if (!chat) throw new AppError('Chat not found', 404, 'NOT_FOUND');
    chat.isPinned = !chat.isPinned;
    await chat.save();
    return success(res, chat, chat.isPinned ? 'Pinned' : 'Unpinned');
  } catch (error) {
    next(error);
  }
};

// POST /api/chats/:id/agora-token
const getAgoraToken = async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, participants: req.user._id });
    if (!chat) throw new AppError('Chat not found', 404, 'NOT_FOUND');
    const token = generateRTMToken(req.user.agoraUid || req.user._id.toString());
    return success(res, { token: token.token, channel: chat.agoraChannel }, 'Agora token');
  } catch (error) {
    next(error);
  }
};

// POST /api/chats/:id/files
const pinFile = async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) throw new AppError('Chat not found', 404, 'NOT_FOUND');
    chat.pinnedFiles.push({ name: req.body.name, url: req.body.url, uploadedBy: req.user._id });
    await chat.save();
    return success(res, chat, 'File pinned');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/chats/:id/files/:fileId
const unpinFile = async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) throw new AppError('Chat not found', 404, 'NOT_FOUND');
    chat.pinnedFiles = chat.pinnedFiles.filter(f => f._id.toString() !== req.params.fileId);
    await chat.save();
    return success(res, chat, 'File unpinned');
  } catch (error) {
    next(error);
  }
};

// POST /api/chats/ai/chat
const aiChat = async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings?.ai?.aiEnabled || !settings?.ai?.chatEnabled)
      throw new AppError('AI Chat is currently disabled', 403, 'AI_DISABLED');
    const { message, systemPrompt } = req.body;
    if (!message) throw new AppError('Message is required', 400, 'MISSING_MESSAGE');
    const { generalChat } = await import('../../config/hdmAI.js');
    const result = await generalChat(message, systemPrompt);
    return success(res, {
      reply: result.data?.reply || result.reply,
      model: result.data?.model || 'unknown',
      tokensUsed: result.data?.tokensUsed || 0,
      provider: 'HDM AI',
    }, 'AI response');
  } catch (error) {
    next(error);
  }
};

// POST /api/chats/upload
const uploadChatFile = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('File required', 400, 'FILE_REQUIRED');
    const result = await cloudinaryService.uploadChatFile(req.file, req.user._id, req.user._id);
    if (!result.success) throw new AppError('Upload failed', 500, 'UPLOAD_FAILED');
    return success(res, {
      url: result.url,
      fileName: result.fileName,
      fileSize: result.fileSize,
      type: req.file.mimetype.startsWith('image/') ? 'image' : 'file',
    }, 'File uploaded');
  } catch (error) {
    next(error);
  }
};

export {
  getChats, getChatById, createDirectChat, createGroupChat,
  updateGroupChat, addParticipant, removeParticipant, leaveChat,
  pinChat, getAgoraToken, pinFile, unpinFile, aiChat,uploadChatFile ,
};