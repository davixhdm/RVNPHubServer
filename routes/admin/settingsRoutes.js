import { Router } from 'express';
import adminAuth from '../../middleware/admin/adminAuth.js';
import adminRole from '../../middleware/admin/adminRole.js';
import {
  getAllSettings, updateGeneral, updateAI, updateEmail, testEmail,
  updateSMS, testSMS, updateLegals, updateUploads, updateToggles,
  updateDownloads, updateBadges, updateScoring, updateLimits,
  updateJobs, updatePricing,
} from '../../controllers/admin/settingsController.js';

const router = Router();

router.get('/settings', adminAuth, adminRole('super_admin'), getAllSettings);
router.patch('/settings/general', adminAuth, adminRole('super_admin'), updateGeneral);
router.patch('/settings/ai', adminAuth, adminRole('super_admin'), updateAI);
router.patch('/settings/email', adminAuth, adminRole('super_admin'), updateEmail);
router.post('/settings/email/test', adminAuth, adminRole('super_admin'), testEmail);
router.patch('/settings/sms', adminAuth, adminRole('super_admin'), updateSMS);
router.post('/settings/sms/test', adminAuth, adminRole('super_admin'), testSMS);
router.patch('/settings/legals', adminAuth, adminRole('super_admin'), updateLegals);
router.patch('/settings/uploads', adminAuth, adminRole('super_admin'), updateUploads);
router.patch('/settings/toggles', adminAuth, adminRole('super_admin'), updateToggles);
router.patch('/settings/downloads', adminAuth, adminRole('super_admin'), updateDownloads);
router.patch('/settings/badges', adminAuth, adminRole('super_admin'), updateBadges);
router.patch('/settings/scoring', adminAuth, adminRole('super_admin'), updateScoring);
router.patch('/settings/limits', adminAuth, adminRole('super_admin'), updateLimits);
router.patch('/settings/jobs', adminAuth, adminRole('super_admin'), updateJobs);
router.patch('/settings/pricing', adminAuth, adminRole('super_admin'), updatePricing);

export default router;