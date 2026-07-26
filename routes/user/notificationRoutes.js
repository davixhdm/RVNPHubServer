import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import validateObjectId from '../../middleware/user/validateObjectId.js';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, getUnreadCount, updatePreferences } from '../../controllers/user/notificationController.js';

const router = Router();

router.get('/notifications', auth(), getNotifications);
router.get('/notifications/unread-count', auth(), getUnreadCount);
router.patch('/notifications/read-all', auth(), markAllAsRead);
router.patch('/notifications/preferences', auth(), updatePreferences);
router.patch('/notifications/:id/read', auth(), validateObjectId('id'), markAsRead);
router.delete('/notifications/:id', auth(), validateObjectId('id'), deleteNotification);

export default router;