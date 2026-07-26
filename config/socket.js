import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import User from '../models/user/User.js';

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [process.env.CLIENT_URL, process.env.ADMIN_URL],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        return next(new Error('User not found'));
      }

      if (user.isSuspended || user.isBanned) {
        return next(new Error('Account suspended or banned'));
      }

      socket.userId = user._id.toString();
      socket.user = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department,
        hostel: user.hostel,
        hdmVerified: user.hdmVerified,
      };

      next();
    } catch (error) {
      logger.error('Socket auth error:', error.message);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId, user } = socket;

    // Join personal room
    socket.join(`user:${userId}`);

    // Join department room
    if (user.department) {
      socket.join(`dept:${user.department}`);
    }

    // Join hostel room
    if (user.hostel) {
      socket.join(`hostel:${user.hostel}`);
    }

    // Join group rooms
    const groups = await User.findById(userId).select('groups');
    // groups will be handled when group service emits

    // Update online status
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });

    // Broadcast to relevant rooms
    io.to(`dept:${user.department}`).emit('user:online', { userId, user });
    io.to(`hostel:${user.hostel}`).emit('user:online', { userId, user });

    logger.info(`Socket connected: ${user.firstName} (${userId})`);

    // Handle typing
    socket.on('user:typing', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('user:typing', { chatId, userId, userName: user.firstName });
    });

    socket.on('user:stopTyping', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('user:stopTyping', { chatId, userId });
    });

    // Join chat room
    socket.on('chat:join', ({ chatId }) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on('chat:leave', ({ chatId }) => {
      socket.leave(`chat:${chatId}`);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });

      io.to(`dept:${user.department}`).emit('user:offline', { userId });
      io.to(`hostel:${user.hostel}`).emit('user:offline', { userId });

      logger.info(`Socket disconnected: ${user.firstName} (${userId})`);
    });
  });

  logger.info('Socket.IO initialized');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

export { initSocket, getIO };