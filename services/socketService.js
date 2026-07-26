import { getIO } from '../config/socket.js';
import logger from '../utils/logger.js';

// ============================================
// Connection Management
// ============================================

export const isUserOnline = (userId) => {
  try {
    const io = getIO();
    const sockets = io.sockets.adapter.rooms.get(`user:${userId}`);
    return sockets && sockets.size > 0;
  } catch {
    return false;
  }
};

// ============================================
// Direct Messaging
// ============================================

export const emitToUser = (userId, event, data) => {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit(event, data);
  } catch (error) {
    logger.error('emitToUser failed:', error);
  }
};

export const emitToUsers = (userIds, event, data) => {
  try {
    const io = getIO();
    userIds.forEach(id => io.to(`user:${id}`).emit(event, data));
  } catch (error) {
    logger.error('emitToUsers failed:', error);
  }
};

// ============================================
// Room Broadcasting
// ============================================

export const emitToDepartment = (department, event, data) => {
  try {
    const io = getIO();
    io.to(`dept:${department}`).emit(event, data);
  } catch (error) {
    logger.error('emitToDepartment failed:', error);
  }
};

export const emitToHostel = (hostel, event, data) => {
  try {
    const io = getIO();
    io.to(`hostel:${hostel}`).emit(event, data);
  } catch (error) {
    logger.error('emitToHostel failed:', error);
  }
};

export const emitToGroup = (groupId, event, data) => {
  try {
    const io = getIO();
    io.to(`group:${groupId}`).emit(event, data);
  } catch (error) {
    logger.error('emitToGroup failed:', error);
  }
};

export const emitToChat = (chatId, event, data) => {
  try {
    const io = getIO();
    io.to(`chat:${chatId}`).emit(event, data);
  } catch (error) {
    logger.error('emitToChat failed:', error);
  }
};

export const emitToAll = (event, data) => {
  try {
    const io = getIO();
    io.emit(event, data);
  } catch (error) {
    logger.error('emitToAll failed:', error);
  }
};

// ============================================
// Chat Events
// ============================================

export const newMessage = (chatId, message) => {
  emitToChat(chatId, 'chat:newMessage', message);
};

export const messageRead = (chatId, messageId, readBy) => {
  emitToChat(chatId, 'chat:messageRead', { chatId, messageId, readBy });
};

// ============================================
// Notification Events
// ============================================

export const newNotification = (userId, notification) => {
  emitToUser(userId, 'notification:new', notification);
};

// ============================================
// Feed Events
// ============================================

export const newPostInFeed = (post) => {
  if (post.department) {
    emitToDepartment(post.department, 'post:new', post);
  }
};

// ============================================
// Story Events
// ============================================

export const newStoryAvailable = (userId, story) => {
  emitToUser(userId, 'story:new', story);
};

export const departmentStoryAdded = (department, story) => {
  emitToDepartment(department, 'story:new', story);
};

// ============================================
// Group Events
// ============================================

export const memberJoinedGroup = (groupId, user) => {
  emitToGroup(groupId, 'group:memberJoined', user);
};

export const newGroupPost = (groupId, post) => {
  emitToGroup(groupId, 'group:newPost', post);
};

// ============================================
// Marketplace Events
// ============================================

export const listingInterested = (sellerId, data) => {
  emitToUser(sellerId, 'market:interested', data);
};

// ============================================
// Award Events
// ============================================

export const badgeEarned = (userId, badge) => {
  emitToUser(userId, 'award:badgeEarned', badge);
};

// ============================================
// Call Events
// ============================================

export const callIncoming = (calleeId, callData) => {
  emitToUser(calleeId, 'call:incoming', callData);
};

export const callAccepted = (callerId, callData) => {
  emitToUser(callerId, 'call:accepted', callData);
};

export const callRejected = (callerId, callData) => {
  emitToUser(callerId, 'call:rejected', callData);
};

export const callEnded = (participants, callData) => {
  emitToUsers(participants, 'call:ended', callData);
};

// ============================================
// Admin Broadcast
// ============================================

export const adminAnnouncement = (announcement) => {
  emitToAll('announcement:broadcast', announcement);
};

export const systemAlert = (message) => {
  emitToAll('system:alert', { message, timestamp: new Date().toISOString() });
};