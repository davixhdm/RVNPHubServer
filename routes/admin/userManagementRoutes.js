import { Router } from 'express';
import adminAuth from '../../middleware/admin/adminAuth.js';
import adminRole from '../../middleware/admin/adminRole.js';
import {
  getUsers, getUserById, updateUser, suspendUser, unsuspendUser,
  banUser, unbanUser, grantVerification, revokeVerification,
  getVerificationQueue, deleteUser, getAdmins, getAuditLogs,
  approveVerificationFromQueue, rejectVerificationFromQueue,
} from '../../controllers/admin/userManagementController.js';

const router = Router();

// Users
router.get('/users', adminAuth, getUsers);
router.get('/users/:id', adminAuth, getUserById);
router.patch('/users/:id', adminAuth, adminRole('super_admin'), updateUser);
router.post('/users/:id/suspend', adminAuth, adminRole('super_admin', 'moderator'), suspendUser);
router.post('/users/:id/unsuspend', adminAuth, adminRole('super_admin', 'moderator'), unsuspendUser);
router.post('/users/:id/ban', adminAuth, adminRole('super_admin'), banUser);
router.post('/users/:id/unban', adminAuth, adminRole('super_admin'), unbanUser);
router.post('/users/:id/verify', adminAuth, adminRole('super_admin'), grantVerification);
router.post('/users/:id/unverify', adminAuth, adminRole('super_admin'), revokeVerification);
router.delete('/users/:id', adminAuth, adminRole('super_admin'), deleteUser);

// Verification Queue
router.get('/verification-queue', adminAuth, adminRole('super_admin'), getVerificationQueue);
router.post('/verification-queue/:id/approve', adminAuth, adminRole('super_admin'), approveVerificationFromQueue);
router.post('/verification-queue/:id/reject', adminAuth, adminRole('super_admin'), rejectVerificationFromQueue);

// Admin Accounts & Audit
router.get('/admins', adminAuth, adminRole('super_admin'), getAdmins);
router.get('/audit-logs', adminAuth, getAuditLogs);

export default router;