import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 50 },
  description: { type: String, maxlength: 500, default: '' },
  coverImage: { type: String, default: null },
  slug: { type: String, required: true, unique: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  memberCount: { type: Number, default: 1 },
  department: { type: String, default: null },
  category: { type: String, enum: ['academic', 'sports', 'arts', 'tech', 'social', 'other'], default: 'other' },
  isActive: { type: Boolean, default: true },
  requiresApproval: { type: Boolean, default: false },
  isPrivate: { type: Boolean, default: false },
  rules: [{ type: String }],
  files: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  }],
  events: [{
    title: { type: String, required: true },
    description: { type: String, default: '' },
    date: { type: Date, required: true },
    location: { type: String, default: null },
    going: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    goingCount: { type: Number, default: 0 },
  }],
  wallPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  joinRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reports: [{
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

groupSchema.index({ members: 1 });
groupSchema.index({ department: 1 });

export default mongoose.model('Group', groupSchema);