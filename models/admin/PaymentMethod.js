import mongoose from 'mongoose';

const paymentMethodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  type: { type: String, enum: ['mpesa', 'card', 'bank', 'cash'], required: true },
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  minAmount: { type: Number, default: 10 },
  maxAmount: { type: Number, default: 150000 },
  processingFee: { type: Number, default: 0 },
  processingFeeFixed: { type: Number, default: 0 },
  instructions: { type: String, default: '' },
  config: {
    phoneNumber: { type: String, default: null },
    tillNumber: { type: String, default: null },
    paybillNumber: { type: String, default: null },
    accountNumber: { type: String, default: null },
  },
  supportedCountries: [{ type: String }],
}, { timestamps: true });

export default mongoose.model('PaymentMethod', paymentMethodSchema);