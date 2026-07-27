import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  type: { type: String, enum: ['direct', 'group'], required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  groupName: { type: String, default: null },
  groupAvatar: { type: String, default: null },
  isPinned: { type: Boolean, default: false },
  isAI: { type: Boolean, default: false },
  lastMessage: {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String },
    type: { type: String, enum: ['text', 'image', 'poll', 'file', 'call', 'ai'] },
    createdAt: { type: Date },
  },
  unreadCount: { type: Object, default: {} },
  agoraChannel: { type: String, required: true, unique: true },
  pinnedFiles: [{
    name: { type: String },
    url: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

chatSchema.index({ participants: 1 });

export default mongoose.model('Chat', chatSchema);