import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, default: '' },
  image: { type: String, default: null },
  targetAudience: { type: String, enum: ['all', 'department', 'hostel', 'group'], default: 'all' },
  targetIds: [{ type: mongoose.Schema.Types.ObjectId }],
  channels: [{ type: String, enum: ['in-app', 'email', 'sms', 'push'] }],
  priority: { type: String, enum: ['normal', 'important', 'urgent'], default: 'normal' },
  status: { type: String, enum: ['draft', 'scheduled', 'sent', 'failed'], default: 'draft' },
  scheduledAt: { type: Date, default: null },
  sentAt: { type: Date, default: null },
  deliveryStats: { sent: Number, opened: Number, clicked: Number },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

export default mongoose.model('Announcement', announcementSchema);