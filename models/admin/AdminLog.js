import mongoose from 'mongoose';

const adminLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  adminEmail: { type: String, required: true },
  action: { type: String, required: true },
  target: { type: String, default: null },
  details: { type: String, default: null },
  ip: { type: String, default: null },
  endpoint: { type: String, default: null },
  method: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model('AdminLog', adminLogSchema);