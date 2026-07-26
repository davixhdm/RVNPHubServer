import './dnsSet.js';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

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
import Group from '../models/user/Group.js';
import Listing from '../models/user/Listing.js';
import Badge from '../models/user/Badge.js';
import Leaderboard from '../models/user/Leaderboard.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
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
// Clear Database
// ============================================
const clearDB = async () => {
  console.log('\n⚠️  Clearing all collections...\n');
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  console.log('✓ All collections cleared\n');
};

// ============================================
// Seed Functions
// ============================================

const seedAdmin = async () => {
  console.log('\n┌─────────────────────────────────────────────┐');
  console.log('│              SEEDING ADMIN                  │');
  console.log('└─────────────────────────────────────────────┘\n');

  const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
  if (existing) {
    console.log(`  Admin already exists: ${existing.email}`);
    console.log('  Skipping...\n');
    return existing;
  }

  const admin = await Admin.create({
    name: 'HDM Super Admin',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    role: 'super_admin',
    isActive: true,
  });

  console.log(`  ✓ Admin created: ${admin.email}\n`);
  return admin;
};

const seedSettings = async () => {
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│             SEEDING SETTINGS                │');
  console.log('└─────────────────────────────────────────────┘\n');

  const existing = await Settings.findOne();
  if (existing) {
    console.log('  Settings already exist. Skipping...\n');
    return existing;
  }

  await Settings.create({
    general: {
      systemName: 'RVNP Campus Hub',
      tagline: 'The Digital Quad of Rift Valley National Polytechnic',
      supportEmail: 'support@hdm.com',
      supportPhone: '',
      language: 'en',
      timezone: 'Africa/Nairobi',
      dateFormat: 'DD/MM/YYYY',
    },
    email: {
      senderName: 'RVNP Campus Hub',
      senderEmail: process.env.HDM_BRIDGE_FROM_EMAIL || 'notifications@theirdomain.com',
    },
    sms: { senderId: 'HDM', timeRestrictionEnabled: true },
    uploads: {
      maxFileSizeMB: 20, allowedTypes: ['jpg', 'png', 'gif', 'mp4', 'pdf'],
      maxPostImages: 5, maxMarketImages: 4, maxAvatarSizeMB: 2,
      maxStorySizeMB: 15, maxChatFileSizeMB: 25,
    },
    toggles: {
      userRegistration: true, posts: true, stories: true, chat: true,
      groups: true, marketplace: true, verification: true, leaderboard: true,
      maintenanceMode: false, betaFeatures: false,
    },
    pricing: { verificationFeeKsh: 200, renewalEnabled: false },
    badges: {
      topContributorWeeklyCount: 10, topContributorMonthlyCount: 20,
      topFanThreshold: 30, marketplaceChampionSales: 10, marketplaceChampionRating: 4.5,
      storyStarDays: 7, groupBuilderMembers: 50, lostFoundHeroReturns: 3,
      qaExpertAnswers: 10, earlyAdopterThreshold: 1000,
    },
    scoring: {
      post: 3, comment: 1, helpfulAnswer: 5, listingSold: 4,
      lostFoundReturned: 10, groupFileUpload: 2, storyPosted: 1, repost: 2,
    },
    limits: {
      postMaxChars: 2000, commentMaxChars: 500, listingTitleMaxChars: 100,
      listingDescriptionMaxChars: 1000, groupNameMaxChars: 50, groupDescriptionMaxChars: 500,
      chatMessageMaxChars: 2000, storyCaptionMaxChars: 200,
      postsPerPage: 20, chatsPerPage: 30, marketPerPage: 20,
      usersPerPage: 50, notificationsPerPage: 30,
    },
    jobs: {
      weeklyAwards: '0 8 * * 1', monthlyAwards: '0 8 1 * *',
      storyCleanup: '0 * * * *', feedRanking: '*/30 * * * *',
      checkSubscriptions: '0 8 * * *',
    },
  });

  console.log('  ✓ Settings created\n');
};

const seedLegals = async () => {
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│              SEEDING LEGALS                 │');
  console.log('└─────────────────────────────────────────────┘\n');

  const settings = await Settings.findOne();
  if (!settings) {
    console.log('  ✗ Settings not found. Run option 3 first.\n');
    return;
  }

  settings.legals = {
    termsOfService: 'Terms of Service for RVNP Campus Hub from HDM.',
    privacyPolicy: 'Privacy Policy for RVNP Campus Hub from HDM.',
    communityGuidelines: 'Community Guidelines for RVNP Campus Hub.',
    marketplacePolicy: 'Marketplace Policy for RVNP Campus Hub.',
    lastUpdated: new Date(),
    requireReaccept: false,
  };

  await settings.save();
  console.log('  ✓ Legal documents seeded\n');
};

const seedPlans = async () => {
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│              SEEDING PLANS                  │');
  console.log('└─────────────────────────────────────────────┘\n');

  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => mongoose.connection.once('connected', resolve));
  }

  const existing = await Plan.countDocuments();
  if (existing > 0) {
    console.log('  Plans already exist. Skipping...\n');
    return;
  }

  await Plan.deleteMany({});

  await Plan.insertMany([
    {
      name: 'HDM Free', slug: 'hdm-free',
      description: 'Basic access to RVNP Campus Hub',
      price: 0, duration: 0, durationLabel: 'lifetime',
      features: ['Full feed', '5 groups', '5 listings', 'Basic chat'],
      includesVerification: false, verificationFeeIncluded: false,
      maxListings: 5, maxGroups: 5,
      prioritySupport: false, earlyFeatures: false, customProfile: false,
      isActive: true, sortOrder: 1, color: '#9E9E9E',
    },
    {
      name: 'HDM Pro Monthly', slug: 'hdm-pro-monthly',
      description: 'Enhanced features with HDM Verification',
      price: 500, duration: 30, durationLabel: 'monthly',
      features: ['Everything in Free', 'HDM Verification', 'Unlimited groups', '20 listings', 'Priority support', 'Early features'],
      includesVerification: true, verificationFeeIncluded: true,
      maxListings: 20, maxGroups: -1,
      prioritySupport: true, earlyFeatures: true, customProfile: true,
      isActive: true, sortOrder: 2, color: '#2E7D32',
    },
    {
      name: 'HDM Pro Yearly', slug: 'hdm-pro-yearly',
      description: 'All Pro features at a discounted yearly rate',
      price: 5000, duration: 365, durationLabel: 'yearly',
      features: ['Everything in Pro Monthly', '2 months free', 'Yearly badge'],
      includesVerification: true, verificationFeeIncluded: true,
      maxListings: 20, maxGroups: -1,
      prioritySupport: true, earlyFeatures: true, customProfile: true,
      isActive: true, sortOrder: 3, color: '#1B5E20',
    },
    {
      name: 'HDM Pro One-Time', slug: 'hdm-pro-onetime',
      description: 'Lifetime Pro access with one payment',
      price: 15000, duration: 0, durationLabel: 'lifetime',
      features: ['Everything in Pro', 'Lifetime access', 'Unlimited listings', 'HDM Ambassador consideration'],
      includesVerification: true, verificationFeeIncluded: true,
      maxListings: -1, maxGroups: -1,
      prioritySupport: true, earlyFeatures: true, customProfile: true,
      isActive: true, sortOrder: 4, color: '#C62828',
    },
  ]);

  console.log('  ✓ 4 plans created\n');
};

const seedPaymentMethods = async () => {
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│          SEEDING PAYMENT METHODS            │');
  console.log('└─────────────────────────────────────────────┘\n');

  const existing = await PaymentMethod.countDocuments();
  if (existing > 0) {
    console.log('  Payment methods already exist. Skipping...\n');
    return;
  }

  await PaymentMethod.insertMany([
    {
      name: 'M-Pesa STK Push',
      slug: 'mpesa-stkpush',
      type: 'mpesa',
      isActive: true,
      isDefault: true,
      minAmount: 10,
      maxAmount: 150000,
      processingFee: 0,
      processingFeeFixed: 0,
      instructions: 'You will receive an STK Push on your phone. Enter your M-Pesa PIN to complete payment.',
      config: {
        phoneNumber: null,
        tillNumber: null,
        paybillNumber: null,
        accountNumber: null,
      },
      supportedCountries: ['KE'],
    },
    {
      name: 'M-Pesa Send Money',
      slug: 'mpesa-sendmoney',
      type: 'mpesa',
      isActive: true,
      isDefault: false,
      minAmount: 10,
      maxAmount: 150000,
      processingFee: 0,
      processingFeeFixed: 0,
      instructions: 'Send payment via M-Pesa:\n1. Go to M-Pesa > Send Money\n2. Enter phone number: 07XXXXXXXX\n3. Amount: KSh {amount}\n4. Enter your PIN and confirm\n\nAfter payment, enter the M-Pesa confirmation code.',
      config: {
        phoneNumber: '0768784909',
        tillNumber: null,
        paybillNumber: null,
        accountNumber: null,
      },
      supportedCountries: ['KE'],
    },
    {
      name: 'M-Pesa Till Number',
      slug: 'mpesa-till',
      type: 'mpesa',
      isActive: true,
      isDefault: false,
      minAmount: 10,
      maxAmount: 150000,
      processingFee: 0,
      processingFeeFixed: 0,
      instructions: 'Pay via M-Pesa Till:\n1. Go to M-Pesa > Lipa na M-Pesa > Buy Goods and Services\n2. Enter Till Number: 000000\n3. Amount: KSh {amount}\n4. Enter your PIN and confirm\n\nAfter payment, enter the M-Pesa confirmation code.',
      config: {
        phoneNumber: null,
        tillNumber: '000000',
        paybillNumber: null,
        accountNumber: null,
      },
      supportedCountries: ['KE'],
    },
    {
      name: 'M-Pesa Paybill',
      slug: 'mpesa-paybill',
      type: 'mpesa',
      isActive: true,
      isDefault: false,
      minAmount: 10,
      maxAmount: 150000,
      processingFee: 0,
      processingFeeFixed: 0,
      instructions: 'Pay via M-Pesa Paybill:\n1. Go to M-Pesa > Lipa na M-Pesa > Paybill\n2. Enter Business Number: 000000\n3. Account Number: RVNP001\n4. Amount: KSh {amount}\n5. Enter your PIN and confirm\n\nAfter payment, enter the M-Pesa confirmation code.',
      config: {
        phoneNumber: null,
        tillNumber: null,
        paybillNumber: '000000',
        accountNumber: 'RVNP001',
      },
      supportedCountries: ['KE'],
    },
  ]);

  console.log('  ✓ 4 payment methods created\n');
  console.log('  ℹ️  Update phone/till/paybill numbers in Admin Panel → Payment Methods\n');
};


const seedDemoUsers = async (userCount = 50) => {
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│            SEEDING DEMO USERS               │');
  console.log('└─────────────────────────────────────────────┘\n');

  const firstNames = ['Brian', 'Agnes', 'Peter', 'James', 'Sarah', 'Kevin', 'Mary', 'David', 'Grace', 'John', 'Faith', 'Samuel', 'Mercy', 'Daniel', 'Esther', 'Michael', 'Joyce', 'Thomas', 'Ruth', 'Paul', 'Naomi', 'Joseph', 'Lydia', 'Charles', 'Hannah'];
  const lastNames = ['Kiprotich', 'Wanjiku', 'Mwangi', 'Odhiambo', 'Nekesa', 'Kamau', 'Akinyi', 'Ochieng', 'Wambui', 'Omondi', 'Chebet', 'Kipngetich', 'Njeri', 'Otieno', 'Wangari', 'Mutua', 'Jepchirchir', 'Karanja', 'Auma', 'Kiplagat'];
  const departments = ['engineering', 'agriculture', 'business', 'it', 'creative_arts', 'sports'];
  const hostels = ['hostel_a', 'hostel_b', 'hostel_c', 'hostel_d', 'off_campus'];

  const users = [];
  const demoPassword = await bcrypt.hash('password123', 12);

  users.push({
    email: 'demo@rvnp.ac.ke', password: demoPassword,
    firstName: 'Demo', lastName: 'User',
    department: 'engineering', hostel: 'hostel_b',
    interests: ['coding', 'rugby'],
    hdmVerified: true, hdmVerifiedAt: new Date(),
    emailVerified: true,
  });

  for (let i = 0; i < userCount; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    users.push({
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 1}@rvnp.ac.ke`,
      password: demoPassword,
      firstName, lastName,
      department: departments[Math.floor(Math.random() * departments.length)],
      hostel: hostels[Math.floor(Math.random() * hostels.length)],
      interests: [departments[Math.floor(Math.random() * departments.length)]],
      emailVerified: true,
    });
  }

  const created = await User.insertMany(users);
  console.log(`  ✓ ${created.length} users created\n`);
  return created;
};

const seedDemoPosts = async (postCount = 200, users) => {
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│            SEEDING DEMO POSTS               │');
  console.log('└─────────────────────────────────────────────┘\n');

  if (!users || users.length === 0) {
    console.log('  ✗ No users found. Run option 7 first.\n');
    return;
  }

  const types = ['post', 'event', 'lost_found', 'project', 'qna'];
  const posts = [];

  for (let i = 0; i < postCount; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    posts.push({
      author: user._id, type,
      content: `This is a sample ${type} post #${i + 1} on RVNP Campus Hub.`,
      category: type === 'project' ? 'projects' : type === 'qna' ? 'qna' : 'all',
      department: user.department,
      isUrgent: Math.random() < 0.1,
      likeCount: Math.floor(Math.random() * 50),
      commentCount: Math.floor(Math.random() * 20),
      repostCount: Math.floor(Math.random() * 10),
      status: 'active', moderationStatus: 'approved',
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 86400000)),
    });
  }

  const created = await Post.insertMany(posts);
  console.log(`  ✓ ${created.length} posts created\n`);
  return created;
};

const seedDemoGroups = async (users) => {
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│            SEEDING DEMO GROUPS              │');
  console.log('└─────────────────────────────────────────────┘\n');

  if (!users || users.length === 0) {
    console.log('  ✗ No users found. Run option 7 first.\n');
    return;
  }

  const groupData = [
    { name: 'RVNP Rugby Club', department: 'sports', category: 'sports' },
    { name: 'Engineering Workshop', department: 'engineering', category: 'tech' },
    { name: 'Agriculture & Environment', department: 'agriculture', category: 'academic' },
    { name: 'IT & Programming Club', department: 'it', category: 'tech' },
    { name: 'Creative Arts Collective', department: 'creative_arts', category: 'arts' },
    { name: 'Business & Entrepreneurship', department: 'business', category: 'academic' },
    { name: 'Hostel B Community', department: 'engineering', category: 'social' },
    { name: 'Campus Christian Union', department: 'agriculture', category: 'social' },
  ];

  const groups = [];
  for (const g of groupData) {
    const admin = users[Math.floor(Math.random() * users.length)];
    const members = users.slice(0, Math.floor(Math.random() * 30) + 5).map(u => u._id);
    groups.push({
      name: g.name,
      slug: g.name.toLowerCase().replace(/\s+/g, '-').replace(/[&]/g, 'and'),
      description: `${g.name} — official group on RVNP Campus Hub`,
      admin: admin._id, members, memberCount: members.length,
      department: g.department, category: g.category, isActive: true,
    });
  }

  const created = await Group.insertMany(groups);
  console.log(`  ✓ ${created.length} groups created\n`);
  return created;
};

const seedDemoListings = async (users) => {
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│           SEEDING DEMO LISTINGS             │');
  console.log('└─────────────────────────────────────────────┘\n');

  if (!users || users.length === 0) {
    console.log('  ✗ No users found. Run option 7 first.\n');
    return;
  }

  const categories = ['textbooks', 'tools', 'electronics', 'hostel', 'clothing', 'other'];
  const listings = [];

  for (let i = 0; i < 40; i++) {
    const seller = users[Math.floor(Math.random() * users.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    listings.push({
      seller: seller._id,
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} Item #${i + 1}`,
      description: `Good condition ${category} item for sale.`,
      price: Math.floor(Math.random() * 5000) + 100,
      currency: 'KSh', category,
      condition: ['like_new', 'good', 'fair'][Math.floor(Math.random() * 3)],
      location: seller.hostel,
      status: Math.random() > 0.2 ? 'active' : 'sold',
      moderationStatus: 'approved',
    });
  }

  const created = await Listing.insertMany(listings);
  console.log(`  ✓ ${created.length} listings created\n`);
  return created;
};

const seedDemoBadges = async (users) => {
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│            SEEDING DEMO BADGES              │');
  console.log('└─────────────────────────────────────────────┘\n');

  if (!users || users.length === 0) {
    console.log('  ✗ No users found. Run option 7 first.\n');
    return;
  }

  const badges = [];

  for (const user of users.slice(0, 5)) {
    badges.push({ user: user._id, type: 'hdm_verified', name: 'HDM Verified', emoji: '🔵', description: 'HDM-granted VIP status', tier: 'permanent', awardedAt: new Date(), isActive: true });
  }

  for (const user of users.slice(0, 20)) {
    badges.push({ user: user._id, type: 'rvnp_pioneer', name: 'RVNP Pioneer', emoji: '🚀', description: 'Among the first 1,000 users', tier: 'permanent', awardedAt: new Date(), isActive: true });
  }

  for (const user of users.slice(0, 10)) {
    badges.push({ user: user._id, type: 'top_contributor_weekly', name: 'Top Contributor — Weekly', emoji: '🥇', description: 'Top 10 this week', tier: 'weekly', awardedAt: new Date(), expiresAt: new Date(Date.now() + 7 * 86400000), isActive: true });
  }

  const created = await Badge.insertMany(badges);
  console.log(`  ✓ ${created.length} badges created\n`);
  return created;
};

const seedDemoStories = async (users) => {
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│            SEEDING DEMO STORIES             │');
  console.log('└─────────────────────────────────────────────┘\n');

  if (!users || users.length === 0) {
    console.log('  ✗ No users found. Run option 7 first.\n');
    return;
  }

  const stories = [];
  for (let i = 0; i < 30; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    stories.push({
      author: user._id,
      mediaUrl: 'https://via.placeholder.com/400x700/1B5E20/FFFFFF?text=Story',
      mediaType: Math.random() > 0.5 ? 'image' : 'video',
      caption: `Story ${i + 1}`, location: 'RVNP Campus',
      viewers: users.slice(0, Math.floor(Math.random() * 10)).map(u => u._id),
      viewCount: Math.floor(Math.random() * 30),
      expiresAt: i < 10 ? new Date(Date.now() - 3600000) : new Date(Date.now() + 12 * 3600000),
      moderationStatus: 'approved',
    });
  }

  const created = await Story.insertMany(stories);
  console.log(`  ✓ ${created.length} stories created\n`);
  return created;
};

const seedDemoChats = async (users) => {
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│            SEEDING DEMO CHATS               │');
  console.log('└─────────────────────────────────────────────┘\n');

  if (!users || users.length < 2) {
    console.log('  ✗ Need at least 2 users. Run option 7 first.\n');
    return;
  }

  const chats = [];
  for (let i = 0; i < 15; i++) {
    const user1 = users[Math.floor(Math.random() * users.length)];
    let user2 = users[Math.floor(Math.random() * users.length)];
    while (user2._id.equals(user1._id)) user2 = users[Math.floor(Math.random() * users.length)];
    chats.push({
      type: 'direct', participants: [user1._id, user2._id],
      lastMessage: { sender: user1._id, content: 'Hey, how are you?', type: 'text', createdAt: new Date() },
      agoraChannel: `rvnp_chat_${Date.now()}_${i}`,
      isActive: true,
    });
  }

  const created = await Chat.insertMany(chats);
  console.log(`  ✓ ${created.length} chats created\n`);
  return created;
};

const seedAll = async () => {
  console.log('\n┌─────────────────────────────────────────────┐');
  console.log('│              SEED ALL — FULL                │');
  console.log('└─────────────────────────────────────────────┘\n');

  await clearDB();
  await seedAdmin();
  await seedSettings();
  await seedLegals();
  await seedPlans();
  await seedPaymentMethods();
  const users = await seedDemoUsers(50);
  await seedDemoPosts(200, users);
  await seedDemoStories(users);
  await seedDemoGroups(users);
  await seedDemoListings(users);
  await seedDemoChats(users);
  await seedDemoBadges(users);

  console.log('┌─────────────────────────────────────────────┐');
  console.log('│           ✅ SEED ALL COMPLETE               │');
  console.log('└─────────────────────────────────────────────┘\n');
};

// ============================================
// Main Menu
// ============================================
const showMenu = async () => {
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│        RVNP CAMPUS HUB — SEEDER             │');
  console.log('│        from HDM                             │');
  console.log('└─────────────────────────────────────────────┘\n');
  console.log('  1.  Seed All (Full fresh database)');
  console.log('  2.  Seed Admin Account');
  console.log('  3.  Seed Settings');
  console.log('  4.  Seed Legals');
  console.log('  5.  Seed Plans');
  console.log('  6.  Seed Payment Methods');
  console.log('  7.  Seed Demo Users');
  console.log('  8.  Seed Demo Posts');
  console.log('  9.  Seed Demo Groups');
  console.log('  10. Seed Demo Listings');
  console.log('  11. Seed Demo Badges');
  console.log('  12. Seed Demo Stories');
  console.log('  13. Seed Demo Chats');
  console.log('  14. Clear Database (Drop all)');
  console.log('  0.  Exit\n');

  const choice = await question('  Select option: ');
  let users;

  switch (choice) {
    case '1': await seedAll(); break;
    case '2': await seedAdmin(); break;
    case '3': await seedSettings(); break;
    case '4': await seedLegals(); break;
    case '5': await seedPlans(); break;
    case '6': await seedPaymentMethods(); break;
    case '7':
      const userCount = parseInt(await question('  How many users? (default 50): ')) || 50;
      users = await seedDemoUsers(userCount);
      break;
    case '8':
      users = await User.find({});
      if (users.length === 0) { console.log('  ✗ No users. Run option 7 first.\n'); }
      else { const n = parseInt(await question('  How many posts? (default 200): ')) || 200; await seedDemoPosts(n, users); }
      break;
    case '9':
      users = await User.find({});
      if (users.length === 0) { console.log('  ✗ No users. Run option 7 first.\n'); }
      else { await seedDemoGroups(users); }
      break;
    case '10':
      users = await User.find({});
      if (users.length === 0) { console.log('  ✗ No users. Run option 7 first.\n'); }
      else { await seedDemoListings(users); }
      break;
    case '11':
      users = await User.find({});
      if (users.length === 0) { console.log('  ✗ No users. Run option 7 first.\n'); }
      else { await seedDemoBadges(users); }
      break;
    case '12':
      users = await User.find({});
      if (users.length === 0) { console.log('  ✗ No users. Run option 7 first.\n'); }
      else { await seedDemoStories(users); }
      break;
    case '13':
      users = await User.find({});
      if (users.length === 0) { console.log('  ✗ No users. Run option 7 first.\n'); }
      else { await seedDemoChats(users); }
      break;
    case '14':
      if ((await question('  ⚠️  Delete ALL data? (yes/no): ')).toLowerCase() === 'yes') await clearDB();
      break;
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