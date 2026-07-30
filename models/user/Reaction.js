import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'love', 'haha', 'angry', 'sad', 'cry'], required: true },
  targetType: { type: String, enum: ['post', 'comment'], required: true },
}, { timestamps: true });

reactionSchema.index({ post: 1, user: 1, targetType: 1 });
reactionSchema.index({ comment: 1, user: 1, targetType: 1 });
reactionSchema.index({ post: 1, type: 1 });

export default mongoose.model('Reaction', reactionSchema);