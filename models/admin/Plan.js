import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  currency: { type: String, default: 'KSh' },
  duration: { type: Number, default: 0 },
  durationLabel: { type: String, enum: ['monthly', 'yearly', 'lifetime'], required: true },
  features: [{ type: String }],
  includesVerification: { type: Boolean, default: false },
  verificationFeeIncluded: { type: Boolean, default: false },
  badge: { type: String, default: null },
  maxListings: { type: Number, default: 5 },
  maxGroups: { type: Number, default: 5 },
  prioritySupport: { type: Boolean, default: false },
  earlyFeatures: { type: Boolean, default: false },
  customProfile: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  color: { type: String, default: '#9E9E9E' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
}, { timestamps: true });

export default mongoose.model('Plan', planSchema);