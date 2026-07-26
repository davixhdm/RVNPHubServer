import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  name: { type: String, required: true },
  emoji: { type: String, default: '🏆' },
  description: { type: String, default: '' },
  tier: { type: String, enum: ['weekly', 'monthly', 'permanent'], default: 'permanent' },
  awardedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  revokedAt: { type: Date, default: null },
  revokeReason: { type: String, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

badgeSchema.index({ user: 1, type: 1 });
badgeSchema.index({ user: 1, isActive: 1 });

export default mongoose.model('Badge', badgeSchema);