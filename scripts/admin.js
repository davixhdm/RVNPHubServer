import './dnsSet.js';
import dotenv from 'dotenv';
dotenv.config();

import readline from 'readline';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from '../models/admin/Admin.js';
import Settings from '../models/admin/Settings.js';
import Plan from '../models/admin/Plan.js';
import PaymentMethod from '../models/admin/PaymentMethod.js';
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
import AdminLog from '../models/admin/AdminLog.js';
import Announcement from '../models/admin/Announcement.js';
import Report from '../models/admin/Report.js';
import SupportTicket from '../models/admin/SupportTicket.js';
import Payment from '../models/admin/Payment.js';
import Backup from '../models/admin/Backup.js';
import logger from '../utils/logger.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// ============================================
// Connect to MongoDB
// ============================================
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ MongoDB connected\n');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// ============================================
// All Collections
// ============================================
const allCollections = {
  admins: Admin,
  admin_logs: AdminLog,
  announcements: Announcement,
  reports: Report,
  support_tickets: SupportTicket,
  settings: Settings,
  payments: Payment,
  payment_methods: PaymentMethod,
  plans: Plan,
  backups: Backup,
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

// ============================================
// Admin Welcome Email Template
// ============================================
const getAdminWelcomeEmail = async (adminName, systemName, email, password, adminUrl) => {
  const subject = `Welcome to ${systemName} Admin Panel — HDM`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#F5F5F0;font-family:'Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5F0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background-color:#1B5E20;padding:32px 40px;text-align:center;">
              <h1 style="color:#FFFFFF;font-size:22px;margin:0;font-weight:700;">${systemName} Admin</h1>
              <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:6px 0 0 0;">from HDM</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#4A5A4A;font-size:15px;margin:0 0 8px 0;">Hello ${adminName},</p>
              <h2 style="color:#212121;font-size:20px;margin:0 0 20px 0;font-weight:700;">Welcome to the Admin Team! 🎉</h2>
              <p style="color:#4A5A4A;font-size:15px;line-height:1.7;margin:0 0 24px 0;">
                You have been added as an administrator on <strong>${systemName}</strong>.
                Below are your login credentials:
              </p>

              <!-- Credentials Box -->
              <table width="100%" cellpadding="16" style="background-color:#E8F5E9;border-radius:12px;margin:0 0 24px 0;">
                <tr>
                  <td style="color:#4A5A4A;font-size:14px;padding:8px 16px;">Admin Panel URL</td>
                  <td style="color:#1B5E20;font-weight:700;font-size:14px;padding:8px 16px;">${adminUrl}</td>
                </tr>
                <tr>
                  <td style="color:#4A5A4A;font-size:14px;padding:8px 16px;">Email</td>
                  <td style="color:#1B5E20;font-weight:700;font-size:14px;padding:8px 16px;">${email}</td>
                </tr>
                <tr>
                  <td style="color:#4A5A4A;font-size:14px;padding:8px 16px;">Password</td>
                  <td style="color:#1B5E20;font-weight:700;font-size:14px;padding:8px 16px;">${password}</td>
                </tr>
              </table>

              <p style="color:#C62828;font-size:13px;margin:0 0 24px 0;font-weight:600;">
                ⚠️ Please change your password immediately after your first login.
              </p>

              <a href="${adminUrl}" style="display:inline-block;background-color:#1B5E20;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:14px;">Go to Admin Panel</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 40px 32px;text-align:center;border-top:1px solid #E8F5E9;">
              <p style="color:#4A5A4A;font-size:13px;margin:0 0 4px 0;font-weight:600;">${systemName} — from HDM</p>
              <p style="color:#9E9E9E;font-size:12px;margin:0;">If you did not expect this, contact support immediately.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textBody = `Welcome to ${systemName} Admin Panel\n\nHello ${adminName},\n\nYou have been added as an administrator.\n\nAdmin Panel: ${adminUrl}\nEmail: ${email}\nPassword: ${password}\n\n⚠️ Please change your password immediately.\n\n— ${systemName} from HDM`;

  return { subject, htmlBody, textBody };
};

// ============================================
// 1. List Admins
// ============================================
const listAdmins = async () => {
  console.log('\n┌─────────────────────────────────────────────┐');
  console.log('│               ADMIN ACCOUNTS                │');
  console.log('└─────────────────────────────────────────────┘\n');

  const admins = await Admin.find().sort({ createdAt: -1 });

  if (admins.length === 0) {
    console.log('  No admin accounts found.\n');
    return;
  }

  admins.forEach((admin, index) => {
    console.log(`  ${index + 1}. ${admin.name}`);
    console.log(`     Email    : ${admin.email}`);
    console.log(`     Role     : ${admin.role}`);
    console.log(`     Active   : ${admin.isActive ? '✓' : '✗'}`);
    console.log(`     Created  : ${admin.createdAt.toISOString()}`);
    console.log('');
  });

  console.log(`  Total: ${admins.length} admin(s)\n`);
};

// ============================================
// 2. Create Admin
// ============================================
const createAdmin = async () => {
  console.log('\n┌─────────────────────────────────────────────┐');
  console.log('│             CREATE ADMIN ACCOUNT            │');
  console.log('└─────────────────────────────────────────────┘\n');

  const name = await question('  Name: ');
  const email = await question('  Email: ');
  const password = await question('  Password: ');

  console.log('\n  Roles:');
  console.log('  1. super_admin');
  console.log('  2. moderator');
  console.log('  3. support_agent');
  console.log('  4. analyst');

  const roleChoice = await question('\n  Select role (1-4): ');
  const roles = ['super_admin', 'moderator', 'support_agent', 'analyst'];
  const role = roles[parseInt(roleChoice) - 1] || 'support_agent';

  try {
    const existing = await Admin.findOne({ email });
    if (existing) {
      console.log(`\n  ✗ Admin with email ${email} already exists.\n`);
      return;
    }

    // Create directly — model pre-save hook handles hashing
    const admin = await Admin.create({
      name,
      email,
      password,
      role,
      isActive: true,
    });

    console.log(`\n  ✓ Admin created successfully!`);
    console.log(`    ID    : ${admin._id}`);
    console.log(`    Name  : ${admin.name}`);
    console.log(`    Email : ${admin.email}`);
    console.log(`    Role  : ${admin.role}`);

    // Send Welcome Email
    try {
      const sendEmail = (await import('../config/hdmBridge.js')).default;
      const getSettings = (await import('../utils/getSettings.js')).default;
      const settings = await getSettings();
      const systemName = settings?.general?.systemName || 'RVNP Campus Hub';
      const adminUrl = process.env.ADMIN_URL || 'http://localhost:3001';

      const { subject, htmlBody, textBody } = await getAdminWelcomeEmail(
        admin.name, systemName, email, password, adminUrl
      );

      const result = await sendEmail({
        to: email,
        subject,
        htmlBody,
        textBody,
        fromName: systemName,
      });

      if (result.success) {
        console.log(`    Email  : Welcome email sent ✓`);
      } else {
        console.log(`    Email  : Failed to send ✗`);
      }
    } catch (emailError) {
      console.log(`    Email  : Failed to send — ${emailError.message}`);
    }

    console.log('');
  } catch (error) {
    console.error(`\n  ✗ Error: ${error.message}\n`);
  }
};
// ============================================
// 3. Manage Admin
// ============================================
const manageAdmin = async () => {
  console.log('\n┌─────────────────────────────────────────────┐');
  console.log('│              MANAGE ADMIN ACCOUNT           │');
  console.log('└─────────────────────────────────────────────┘\n');

  const admins = await Admin.find().sort({ createdAt: -1 });

  if (admins.length === 0) {
    console.log('  No admin accounts found.\n');
    return;
  }

  admins.forEach((admin, index) => {
    console.log(`  ${index + 1}. ${admin.name} (${admin.email}) — ${admin.role} [${admin.isActive ? 'Active' : 'Inactive'}]`);
  });

  const choice = await question(`\n  Select admin (1-${admins.length}) or 0 to cancel: `);
  const index = parseInt(choice) - 1;

  if (index < 0 || index >= admins.length) {
    console.log('  Cancelled.\n');
    return;
  }

  const admin = admins[index];

  console.log(`\n  Selected: ${admin.name} (${admin.email})`);
  console.log('  1. Toggle Active Status');
  console.log('  2. Delete Admin');
  console.log('  0. Cancel');

  const action = await question('\n  Select action: ');

  switch (action) {
    case '1':
      admin.isActive = !admin.isActive;
      await admin.save();
      console.log(`\n  ✓ Admin ${admin.isActive ? 'activated' : 'deactivated'}.\n`);
      break;

    case '2':
      const confirm = await question(`\n  Are you sure you want to delete ${admin.name}? (yes/no): `);
      if (confirm.toLowerCase() === 'yes') {
        await Admin.findByIdAndDelete(admin._id);
        console.log(`\n  ✓ Admin deleted.\n`);
      } else {
        console.log('  Cancelled.\n');
      }
      break;

    default:
      console.log('  Cancelled.\n');
  }
};

// ============================================
// 4. List DB Collections
// ============================================
const listCollections = async () => {
  console.log('\n┌─────────────────────────────────────────────┐');
  console.log('│            DATABASE COLLECTIONS             │');
  console.log('└─────────────────────────────────────────────┘\n');

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  if (collections.length === 0) {
    console.log('  No collections found.\n');
    return;
  }

  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`  ${col.name.padEnd(25)} ${String(count).padStart(8)} documents`);
  }

  console.log(`\n  Total: ${collections.length} collections\n`);
};

// ============================================
// 5. Drop DB Collections
// ============================================
const dropCollections = async () => {
  console.log('\n┌─────────────────────────────────────────────┐');
  console.log('│            DROP DATABASE COLLECTIONS        │');
  console.log('└─────────────────────────────────────────────┘\n');

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  if (collections.length === 0) {
    console.log('  No collections to drop.\n');
    return;
  }

  console.log('  Collections:');
  collections.forEach((col, index) => {
    console.log(`  ${index + 1}. ${col.name}`);
  });

  console.log('\n  Options:');
  console.log('  1. Drop a specific collection');
  console.log('  2. Drop ALL collections except settings');
  console.log('  0. Cancel');

  const action = await question('\n  Select option: ');

  switch (action) {
    case '1': {
      const colChoice = await question(`\n  Select collection (1-${collections.length}): `);
      const idx = parseInt(colChoice) - 1;
      if (idx >= 0 && idx < collections.length) {
        const colName = collections[idx].name;
        const confirm = await question(`\n  Drop "${colName}"? This cannot be undone. (yes/no): `);
        if (confirm.toLowerCase() === 'yes') {
          await db.collection(colName).drop();
          console.log(`\n  ✓ Collection "${colName}" dropped.\n`);
        } else {
          console.log('  Cancelled.\n');
        }
      }
      break;
    }

    case '2': {
      const confirm = await question('\n  Drop ALL collections except settings? This cannot be undone. (yes/no): ');
      if (confirm.toLowerCase() === 'yes') {
        for (const col of collections) {
          if (col.name !== 'settings') {
            await db.collection(col.name).drop();
            console.log(`  ✓ Dropped: ${col.name}`);
          }
        }
        console.log('  ✓ Settings collection preserved.\n');
      } else {
        console.log('  Cancelled.\n');
      }
      break;
    }

    default:
      console.log('  Cancelled.\n');
  }
};

// ============================================
// 6. Drop Entire Database
// ============================================
const dropEntireDB = async () => {
  console.log('\n┌─────────────────────────────────────────────┐');
  console.log('│           DROP ENTIRE DATABASE              │');
  console.log('│                                             │');
  console.log('│  ⚠️  WARNING: THIS DELETES EVERYTHING       │');
  console.log('│                                             │');
  console.log('└─────────────────────────────────────────────┘\n');

  const dbName = mongoose.connection.db.databaseName;
  console.log(`  Database: ${dbName}`);
  console.log(`  URI: ${process.env.MONGODB_URI}\n`);

  const confirm1 = await question('  Type the database name to confirm: ');

  if (confirm1 !== dbName) {
    console.log('  ✗ Database name does not match. Cancelled.\n');
    return;
  }

  const confirm2 = await question('\n  Are you absolutely sure? This cannot be undone. (yes/no): ');

  if (confirm2.toLowerCase() !== 'yes') {
    console.log('  Cancelled.\n');
    return;
  }

  try {
    await mongoose.connection.db.dropDatabase();
    console.log(`\n  ✓ Database "${dbName}" dropped entirely.\n`);
    console.log('  You must restart the server or run seed to recreate data.\n');
  } catch (error) {
    console.error(`\n  ✗ Error: ${error.message}\n`);
  }
};

// ============================================
// Main Menu
// ============================================
const showMenu = async () => {
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│           RVNP CAMPUS HUB — ADMIN CLI       │');
  console.log('│           from HDM                          │');
  console.log('└─────────────────────────────────────────────┘\n');

  console.log('  1. List Admins');
  console.log('  2. Create Admin');
  console.log('  3. Manage Admin');
  console.log('  4. List DB Collections');
  console.log('  5. Drop DB Collections');
  console.log('  6. Drop Entire Database');
  console.log('  0. Exit\n');

  const choice = await question('  Select option: ');

  switch (choice) {
    case '1': await listAdmins(); break;
    case '2': await createAdmin(); break;
    case '3': await manageAdmin(); break;
    case '4': await listCollections(); break;
    case '5': await dropCollections(); break;
    case '6': await dropEntireDB(); break;
    case '0':
      console.log('\n  Goodbye.\n');
      await mongoose.connection.close();
      rl.close();
      process.exit(0);
    default:
      console.log('\n  Invalid option.\n');
  }

  await showMenu();
};

// ============================================
// Start
// ============================================
const start = async () => {
  await connectDB();
  await showMenu();
};

start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});