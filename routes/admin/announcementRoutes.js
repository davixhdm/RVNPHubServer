import { Router } from 'express';
import adminAuth from '../../middleware/admin/adminAuth.js';
import adminRole from '../../middleware/admin/adminRole.js';
import { getAnnouncements, getAnnouncementById, createAnnouncement, updateAnnouncement, deleteAnnouncement, sendAnnouncement, resendAnnouncement, scheduleAnnouncement } from '../../controllers/admin/announcementController.js';

const router = Router();

router.get('/announcements', adminAuth, getAnnouncements);
router.get('/announcements/:id', adminAuth, getAnnouncementById);
router.post('/announcements', adminAuth, adminRole('super_admin'), createAnnouncement);
router.patch('/announcements/:id', adminAuth, adminRole('super_admin'), updateAnnouncement);
router.delete('/announcements/:id', adminAuth, adminRole('super_admin'), deleteAnnouncement);
router.post('/announcements/:id/send', adminAuth, adminRole('super_admin'), sendAnnouncement);
router.post('/announcements/:id/resend', adminAuth, adminRole('super_admin'), resendAnnouncement);
router.post('/announcements/:id/schedule', adminAuth, adminRole('super_admin'), scheduleAnnouncement);

export default router;