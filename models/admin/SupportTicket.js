import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  category: { type: String, enum: ['account', 'bug', 'feature_request', 'marketplace_dispute', 'harassment', 'payment', 'general'], default: 'general' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderType: { type: String, enum: ['user', 'admin'], required: true },
    message: { type: String, required: true },
    attachments: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
  }],
  internalNotes: [{
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    note: { type: String },
    createdAt: { type: Date, default: Date.now },
  }],
  resolution: { type: String, default: null },
  rating: { type: Number, min: 1, max: 5, default: null },
}, { timestamps: true });

supportTicketSchema.pre('save', async function (next) {
  if (!this.ticketId) {
    const count = await mongoose.model('SupportTicket').countDocuments();
    this.ticketId = `TKT-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.model('SupportTicket', supportTicketSchema);