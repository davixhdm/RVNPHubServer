import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Backup from '../models/admin/Backup.js';
import Settings from '../models/admin/Settings.js';
import Admin from '../models/admin/Admin.js';
import AdminLog from '../models/admin/AdminLog.js';
import Announcement from '../models/admin/Announcement.js';
import Report from '../models/admin/Report.js';
import SupportTicket from '../models/admin/SupportTicket.js';
import Payment from '../models/admin/Payment.js';
import PaymentMethod from '../models/admin/PaymentMethod.js';
import Plan from '../models/admin/Plan.js';
import User from '../models/user/User.js';
import Post from '../models/user/Post.js';
import Story from '../models/user/Story.js';
import Chat from '../models/user/Chat.js';
import Message from '../models/user/Message.js';
import Group from '../models/user/Group.js';
import Listing from '../models/user/Listing.js';
import Badge from '../models/user/Badge.js';
import Notification from '../models/user/Notification.js';
import Subscription from '../models/user/Subscription.js';
import Leaderboard from '../models/user/Leaderboard.js';
import sendEmail from '../config/hdmBridge.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const collections = {
  admins: Admin, admin_logs: AdminLog, announcements: Announcement,
  reports: Report, support_tickets: SupportTicket, settings: Settings,
  payments: Payment, payment_methods: PaymentMethod, plans: Plan,
  users: User, posts: Post, stories: Story, chats: Chat, messages: Message,
  groups: Group, listings: Listing, badges: Badge,
  notifications: Notification, subscriptions: Subscription, leaderboards: Leaderboard,
};

export const createAutoBackup = async () => {
  try {
    const settings = await Settings.findOne();
    if (!settings || settings.backups?.schedule === 'manual') {
      return { success: false, message: 'Auto backup disabled' };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `rvnp_auto_backup_${timestamp}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    const data = {};
    for (const [name, model] of Object.entries(collections)) {
      data[name] = await model.find({}).lean();
    }

    data._metadata = {
      backupVersion: '1.0', systemName: 'RVNP Campus Hub', from: 'HDM',
      createdAt: new Date().toISOString(), createdBy: 'auto',
      totalCollections: Object.keys(collections).length,
      totalDocuments: Object.values(data).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
    };

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    const stats = fs.statSync(filepath);

    const backup = await Backup.create({
      filename, size: Math.round(stats.size / (1024 * 1024) * 100) / 100,
      type: 'auto', status: 'completed',
      contents: { database: true, files: false, config: true },
      storageLocation: filepath,
    });

    // Apply retention policy
    const backups = await Backup.find({ type: 'auto' }).sort({ createdAt: -1 });
    if (backups.length > (settings.backups?.retentionCount || 7)) {
      const toDelete = backups.slice(settings.backups.retentionCount);
      for (const old of toDelete) {
        if (old.storageLocation && fs.existsSync(old.storageLocation)) {
          fs.unlinkSync(old.storageLocation);
        }
        await Backup.findByIdAndDelete(old._id);
      }
    }

    // Auto-send to email
    if (settings.backups?.autoSendEmail && settings.backups?.autoSendEmailAddress) {
      const fileContent = fs.readFileSync(filepath, 'utf-8');
      await sendEmail({
        to: settings.backups.autoSendEmailAddress,
        subject: `Auto Backup: ${filename} — ${settings.general?.systemName || 'RVNP Campus Hub'}`,
        htmlBody: `<p>Auto backup created: <strong>${filename}</strong> (${backup.size} MB)</p><p>Collections: ${data._metadata.totalCollections}</p><p>Documents: ${data._metadata.totalDocuments}</p>`,
        textBody: `Auto backup: ${filename} (${backup.size} MB)`,
        fromName: settings.general?.systemName || 'RVNP Campus Hub',
      });
    }

    settings.backups.lastBackupDate = new Date();
    settings.backups.lastBackupStatus = 'completed';
    await settings.save();

    logger.info(`Auto backup created: ${filename}`);
    return { success: true, backup };
  } catch (error) {
    logger.error('Auto backup failed:', error);
    const settings = await Settings.findOne();
    if (settings) {
      settings.backups.lastBackupStatus = 'failed';
      await settings.save();
    }
    return { success: false, message: error.message };
  }
};

export const restoreBackup = async (backupId, adminId) => {
  try {
    const backup = await Backup.findById(backupId);
    if (!backup) return { success: false, message: 'Backup not found' };
    if (!backup.storageLocation || !fs.existsSync(backup.storageLocation)) {
      return { success: false, message: 'Backup file not found' };
    }

    const jsonString = fs.readFileSync(backup.storageLocation, 'utf-8');
    const data = JSON.parse(jsonString);
    delete data._metadata;

    for (const [name, docs] of Object.entries(data)) {
      if (collections[name] && Array.isArray(docs)) {
        await collections[name].deleteMany({});
        if (docs.length > 0) await collections[name].insertMany(docs);
      }
    }

    backup.restoredAt = new Date();
    backup.restoredBy = adminId;
    await backup.save();

    return { success: true };
  } catch (error) {
    logger.error('Restore failed:', error);
    return { success: false, message: error.message };
  }
};