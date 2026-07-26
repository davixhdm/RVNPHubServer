import { Router } from 'express';
import adminAuth from '../../middleware/admin/adminAuth.js';
import adminRole from '../../middleware/admin/adminRole.js';
import { uploadChatFile } from '../../middleware/user/upload.js';
import {
  createBackup, uploadAndRestore, getBackups, downloadBackup,
  sendBackupToEmail, deleteBackup, getAutoBackupSettings, updateAutoBackupSettings,
} from '../../controllers/admin/backupController.js';

const router = Router();

router.get('/backups', adminAuth, adminRole('super_admin'), getBackups);
router.post('/backups', adminAuth, adminRole('super_admin'), createBackup);
router.post('/backups/restore', adminAuth, adminRole('super_admin'), uploadChatFile, uploadAndRestore);
router.get('/backups/:id/download', adminAuth, adminRole('super_admin'), downloadBackup);
router.post('/backups/:id/send-email', adminAuth, adminRole('super_admin'), sendBackupToEmail);
router.delete('/backups/:id', adminAuth, adminRole('super_admin'), deleteBackup);
router.get('/backups/settings/auto', adminAuth, adminRole('super_admin'), getAutoBackupSettings);
router.patch('/backups/settings/auto', adminAuth, adminRole('super_admin'), updateAutoBackupSettings);

export default router;