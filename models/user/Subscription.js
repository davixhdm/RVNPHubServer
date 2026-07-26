import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  planName: { type: String, required: true },
  status: { type: String, enum: ['active', 'expired', 'cancelled', 'refunded'], default: 'active' },
  startsAt: { type: Date, required: true },
  expiresAt: { type: Date, default: null },
  autoRenew: { type: Boolean, default: false },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  paymentMethod: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod' },
  amountPaid: { type: Number, required: true },
  cancelledAt: { type: Date, default: null },
  cancelReason: { type: String, default: null },
  refundedAt: { type: Date, default: null },
}, { timestamps: true });

subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ status: 1, expiresAt: 1 });

export default mongoose.model('Subscription', subscriptionSchema);