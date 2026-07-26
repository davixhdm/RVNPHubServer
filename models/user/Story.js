import mongoose from 'mongoose';

const storySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mediaUrl: { type: String, default: null },
  mediaType: { type: String, enum: ['image', 'video', 'text'], default: 'text' },
  caption: { type: String, maxlength: 200, default: '' },
  textContent: { type: String, maxlength: 500, default: null },
  backgroundColor: { type: String, default: '#1B5E20' },
  textColor: { type: String, default: '#FFFFFF' },
  location: { type: String, default: null },
  isOfficial: { type: Boolean, default: false },
  isDepartment: { type: Boolean, default: false },
  department: { type: String, default: null },
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  viewCount: { type: Number, default: 0 },
  reactions: { type: Map, of: Number, default: {} },
  reactionCount: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  moderationStatus: { type: String, enum: ['approved', 'flagged', 'removed'], default: 'approved' },
}, { timestamps: { createdAt: true, updatedAt: false } });

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ author: 1 });
storySchema.index({ department: 1, isDepartment: 1 });

export default mongoose.model('Story', storySchema);