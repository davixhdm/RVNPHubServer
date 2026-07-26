import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['post', 'event', 'lost_found', 'poll', 'project', 'qna'], default: 'post' },
  content: { type: String, maxlength: 2000, default: '' },
  images: [{ type: String }],
  category: { type: String, enum: ['all', 'dept', 'sports', 'projects', 'qna', 'trade'], default: 'all' },
  department: { type: String, default: null },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
    name: { type: String, default: null },
  },
  eventDate: { type: Date, default: null },
  expiryDate: { type: Date, default: null },
  isUrgent: { type: Boolean, default: false },
  feeling: { type: String, default: null },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likeCount: { type: Number, default: 0 },
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 500 },
    helpful: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  }],
  commentCount: { type: Number, default: 0 },
  reposts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  repostCount: { type: Number, default: 0 },
  pollOptions: [{
    text: { type: String, required: true },
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  }],
  status: { type: String, enum: ['active', 'claimed', 'expired', 'removed'], default: 'active' },
  moderationStatus: { type: String, enum: ['approved', 'flagged', 'removed'], default: 'approved' },
  isSpotlight: { type: Boolean, default: false },
  spotlightExpiresAt: { type: Date, default: null },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
}, { timestamps: true });

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ department: 1, createdAt: -1 });
postSchema.index({ location: '2dsphere' });
postSchema.index({ status: 1, moderationStatus: 1 });

export default mongoose.model('Post', postSchema);