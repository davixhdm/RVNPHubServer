import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedContent: { type: mongoose.Schema.Types.ObjectId, required: true },
  contentType: { type: String, enum: ['post', 'story', 'listing', 'message', 'user', 'comment'], required: true },
  reportType: { type: String, enum: ['spam', 'harassment', 'inappropriate', 'fraud', 'other'], required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'under_review', 'resolved', 'dismissed'], default: 'pending' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  resolution: { type: String, default: null },
  actionTaken: { type: String, enum: ['none', 'content_removed', 'user_warned', 'user_suspended', 'user_banned'], default: null },
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);