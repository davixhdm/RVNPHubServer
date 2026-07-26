import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  avatar: { type: String, default: null },
  coverPhoto: { type: String, default: null },
  phone: { type: String, default: null },
  campus: { type: String, enum: ['main', 'kericho_town', 'kureisoi', 'nakuru_town', 'alumni', 'guest'], default: 'main' },
  department: { type: String, enum: ['engineering', 'agriculture', 'business', 'it', 'creative_arts', 'sports', 'other'], default: null },
  hostel: { type: String, enum: ['hostel_a', 'hostel_b', 'hostel_c', 'hostel_d', 'off_campus'], default: 'off_campus' },
  interests: [{ type: String }],
  bio: { type: String, maxlength: 300, default: '' },
  hdmVerified: { type: Boolean, default: false },
  hdmVerifiedAt: { type: Date, default: null },
  badges: [{
    type: { type: String },
    awardedAt: { type: Date },
    expiresAt: { type: Date, default: null },
  }],
  contributionScore: {
    weekly: { type: Number, default: 0 },
    monthly: { type: Number, default: 0 },
    allTime: { type: Number, default: 0 },
  },
  isSuspended: { type: Boolean, default: false },
  suspensionReason: { type: String, default: null },
  suspensionExpiresAt: { type: Date, default: null },
  isBanned: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  refreshToken: { type: String, default: null },
  firebaseToken: { type: String, default: null },
  agoraUid: { type: String, default: null },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: null },
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },

  // Social
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Privacy
  privacy: {
    hideProfile: { type: Boolean, default: false },
    hideLastSeen: { type: Boolean, default: false },
    hideOnlineStatus: { type: Boolean, default: false },
    hideReadReceipts: { type: Boolean, default: false },
    hideLikes: { type: Boolean, default: false },
    ghostMode: { type: Boolean, default: false },
    allowTagging: { type: Boolean, default: true },
    allowMessages: { type: String, enum: ['everyone', 'followers', 'verified', 'none'], default: 'everyone' },
    allowFriendRequests: { type: Boolean, default: true },
    showDepartment: { type: Boolean, default: true },
    showHostel: { type: Boolean, default: true },
  },

  // Subscription
  activeSubscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
  plan: { type: String, enum: ['free', 'pro', 'elite'], default: 'free' },
  planExpiresAt: { type: Date, default: null },
  maxListings: { type: Number, default: 5 },
  maxGroups: { type: Number, default: 5 },
  prioritySupport: { type: Boolean, default: false },
  earlyFeatures: { type: Boolean, default: false },
  customProfileRing: { type: String, default: null },

  // User Settings
  settings: {
    emailDigest: { type: Boolean, default: true },
    pushEnabled: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: false },
    darkMode: { type: Boolean, default: false },
    partyMode: { type: Boolean, default: false },
  },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.firebaseToken;
  return obj;
};

userSchema.index({ department: 1 });
userSchema.index({ hostel: 1 });
userSchema.index({ campus: 1 });

export default mongoose.model('User', userSchema);