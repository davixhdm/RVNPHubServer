import mongoose from 'mongoose';

const leaderboardSchema = new mongoose.Schema({
  period: { type: String, enum: ['weekly', 'monthly', 'all_time'], required: true },
  weekNumber: { type: Number, default: null },
  month: { type: Number, default: null },
  year: { type: Number, required: true },
  department: { type: String, default: null },
  rankings: [{
    rank: { type: Number, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score: { type: Number, default: 0 },
    badges: [{ type: String }],
    department: { type: String },
  }],
  totalParticipants: { type: Number, default: 0 },
  calculatedAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: true, updatedAt: false } });

leaderboardSchema.index({ period: 1, year: 1, weekNumber: 1 });
leaderboardSchema.index({ period: 1, year: 1, month: 1 });
leaderboardSchema.index({ department: 1, period: 1 });

export default mongoose.model('Leaderboard', leaderboardSchema);