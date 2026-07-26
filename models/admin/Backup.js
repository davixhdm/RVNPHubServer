import mongoose from 'mongoose';

const backupSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  size: { type: Number, default: 0 },
  type: { type: String, enum: ['auto', 'manual'], default: 'manual' },
  status: { type: String, enum: ['in_progress', 'completed', 'failed'], default: 'in_progress' },
  contents: {
    database: { type: Boolean, default: true },
    files: { type: Boolean, default: false },
    config: { type: Boolean, default: false },
  },
  storageLocation: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  error: { type: String, default: null },
  restoredAt: { type: Date, default: null },
  restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model('Backup', backupSchema);