import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Backup from '../../models/admin/Backup.js';
import Settings from '../../models/admin/Settings.js';
import Admin from '../../models/admin/Admin.js';
import AdminLog from '../../models/admin/AdminLog.js';
import Announcement from '../../models/admin/Announcement.js';
import Report from '../../models/admin/Report.js';
import SupportTicket from '../../models/admin/SupportTicket.js';
import Payment from '../../models/admin/Payment.js';
import PaymentMethod from '../../models/admin/PaymentMethod.js';
import Plan from '../../models/admin/Plan.js';
import User from '../../models/user/User.js';
import Post from '../../models/user/Post.js';
import Story from '../../models/user/Story.js';
import Chat from '../../models/user/Chat.js';
import Message from '../../models/user/Message.js';
import Group from '../../models/user/Group.js';
import Listing from '../../models/user/Listing.js';
import Badge from '../../models/user/Badge.js';
import Notification from '../../models/user/Notification.js';
import Subscription from '../../models/user/Subscription.js';
import Leaderboard from '../../models/user/Leaderboard.js';
import * as emailService from '../../services/emailService.js';
import { success, created } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import getSettings from '../../utils/getSettings.js';
import logger from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const collections = {
  admins: Admin,
  admin_logs: AdminLog,
  announcements: Announcement,
  reports: Report,
  support_tickets: SupportTicket,
  settings: Settings,
  payments: Payment,
  payment_methods: PaymentMethod,
  plans: Plan,
  users: User,
  posts: Post,
  stories: Story,
  chats: Chat,
  messages: Message,
  groups: Group,
  listings: Listing,
  badges: Badge,
  notifications: Notification,
  subscriptions: Subscription,
  leaderboards: Leaderboard,
};

// POST /api/admin/backups
const createBackup = async (req, res, next) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `rvnp_backup_${timestamp}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    const data = {};

    for (const [name, model] of Object.entries(collections)) {
      const docs = await model.find({}).lean();
      data[name] = docs;
    }

    data._metadata = {
      backupVersion: '1.0',
      systemName: 'RVNP Campus Hub',
      from: 'HDM',
      createdAt: new Date().toISOString(),
      createdBy: req.admin.email,
      totalCollections: Object.keys(collections).length,
      totalDocuments: Object.values(data).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
    };

    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(filepath, jsonString, 'utf-8');

    const stats = fs.statSync(filepath);

    const backup = await Backup.create({
      filename,
      size: stats.size,
      type: 'manual',
      status: 'completed',
      contents: { database: true, files: false, config: true },
      storageLocation: filepath,
      createdBy: req.admin._id,
    });

    logger.info(`Backup created: ${filename} (${(stats.size / 1024).toFixed(1)} KB) by ${req.admin.email}`);
    return created(res, backup, 'Backup created successfully');
  } catch (error) {
    logger.error('Backup creation failed:', error);
    next(error);
  }
};

// POST /api/admin/backups/restore
const uploadAndRestore = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('JSON backup file is required', 400, 'FILE_REQUIRED');

    const jsonString = req.file.buffer.toString('utf-8');
    let data;

    try {
      data = JSON.parse(jsonString);
    } catch {
      throw new AppError('Invalid JSON file', 400, 'INVALID_JSON');
    }

    if (!data._metadata) throw new AppError('Invalid backup file: missing metadata', 400, 'INVALID_BACKUP');

    delete data._metadata;

    let restoredCollections = 0;
    let restoredDocuments = 0;

    for (const [name, docs] of Object.entries(data)) {
      if (collections[name] && Array.isArray(docs)) {
        await collections[name].deleteMany({});
        if (docs.length > 0) {
          await collections[name].insertMany(docs);
        }
        restoredCollections++;
        restoredDocuments += docs.length;
      }
    }

    const filename = `restore_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await Backup.create({
      filename,
      size: req.file.size,
      type: 'manual',
      status: 'completed',
      contents: { database: true, files: false, config: true },
      storageLocation: null,
      createdBy: req.admin._id,
      restoredAt: new Date(),
      restoredBy: req.admin._id,
    });

    logger.info(`Backup restored by ${req.admin.email}: ${restoredCollections} collections, ${restoredDocuments} documents`);
    return success(res, { restoredCollections, restoredDocuments }, 'Database restored successfully');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/backups
const getBackups = async (req, res, next) => {
  try {
    const backups = await Backup.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('restoredBy', 'name email');

    return success(res, backups, 'Backups retrieved');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/backups/:id/download
const downloadBackup = async (req, res, next) => {
  try {
    const backup = await Backup.findById(req.params.id);
    if (!backup) throw new AppError('Backup not found', 404, 'NOT_FOUND');
    if (!backup.storageLocation || !fs.existsSync(backup.storageLocation)) {
      throw new AppError('Backup file not found on disk', 404, 'FILE_NOT_FOUND');
    }

    return res.download(backup.storageLocation, backup.filename);
  } catch (error) {
    next(error);
  }
};

// POST /api/admin/backups/:id/send-email
const sendBackupToEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new AppError('Email address is required', 400, 'MISSING_EMAIL');

    const backup = await Backup.findById(req.params.id);
    if (!backup) throw new AppError('Backup not found', 404, 'NOT_FOUND');

    const settings = await getSettings();
    const systemName = settings?.general?.systemName || 'RVNP Campus Hub';
    const fileSizeKB = ((backup.size || 0) / 1024).toFixed(1);

    const result = await emailService.sendCustomEmail({
      to: email,
      subject: `Backup: ${backup.filename} - ${systemName}`,
      htmlBody: `<h2>${systemName} Backup</h2><p><strong>${backup.filename}</strong> (${fileSizeKB} KB)</p><p>Type: ${backup.type} | Status: ${backup.status}</p>`,
      textBody: `Backup: ${backup.filename} | Size: ${fileSizeKB} KB | Type: ${backup.type} | Status: ${backup.status}`,
    });

    if (result.success) {
      logger.info(`Backup info sent to ${email} by ${req.admin.email}`);
      return success(res, null, `Backup info sent to ${email}`);
    }

    throw new AppError('Failed to send backup email', 500, 'EMAIL_FAILED');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/backups/:id
const deleteBackup = async (req, res, next) => {
  try {
    const backup = await Backup.findById(req.params.id);
    if (!backup) throw new AppError('Backup not found', 404, 'NOT_FOUND');

    if (backup.storageLocation && fs.existsSync(backup.storageLocation)) {
      fs.unlinkSync(backup.storageLocation);
    }

    await Backup.findByIdAndDelete(req.params.id);

    logger.info(`Backup deleted: ${backup.filename} by ${req.admin.email}`);
    return success(res, null, 'Backup deleted');
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/backups/settings/auto
const getAutoBackupSettings = async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    return success(res, {
      enabled: settings?.backups?.schedule !== 'manual',
      frequency: settings?.backups?.schedule || 'daily',
      time: settings?.backups?.time || '03:00',
      retentionCount: settings?.backups?.retentionCount || 7,
      autoSendEmail: settings?.backups?.autoSendEmail || false,
      autoSendEmailAddress: settings?.backups?.autoSendEmailAddress || '',
    }, 'Auto backup settings');
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/backups/settings/auto
const updateAutoBackupSettings = async (req, res, next) => {
  try {
    const { frequency, time, retentionCount, autoSendEmail, autoSendEmailAddress } = req.body;
    const settings = await Settings.findOne();

    if (frequency) settings.backups.schedule = frequency;
    if (time) settings.backups.time = time;
    if (retentionCount !== undefined) settings.backups.retentionCount = retentionCount;
    if (autoSendEmail !== undefined) settings.backups.autoSendEmail = autoSendEmail;
    if (autoSendEmailAddress) settings.backups.autoSendEmailAddress = autoSendEmailAddress;

    await settings.save();
    logger.info(`Auto backup settings updated by ${req.admin.email}`);
    return success(res, settings.backups, 'Auto backup settings updated');
  } catch (error) {
    next(error);
  }
};

export {
  createBackup,
  uploadAndRestore,
  getBackups,
  downloadBackup,
  sendBackupToEmail,
  deleteBackup,
  getAutoBackupSettings,
  updateAutoBackupSettings,
};