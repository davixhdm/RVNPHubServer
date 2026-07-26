import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, maxlength: 2000, default: '' },
  type: { type: String, enum: ['text', 'image', 'poll', 'file', 'call'], default: 'text' },
  fileUrl: { type: String, default: null },
  fileName: { type: String, default: null },
  poll: {
    question: { type: String },
    options: [{
      text: { type: String },
      votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    }],
  },
  callData: {
    type: { type: String, enum: ['audio', 'video'] },
    duration: { type: Number },
    status: { type: String, enum: ['missed', 'completed', 'rejected'] },
  },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  editedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

messageSchema.index({ chat: 1, createdAt: 1 });

export default mongoose.model('Message', messageSchema);