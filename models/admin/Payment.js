import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  transactionId: { type: String, default: null },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'KSh' },
  paymentMethod: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod', default: null },
  paymentMethodType: { type: String, enum: ['mpesa', 'card', 'bank', 'cash'], required: true },
  paymentMethodSlug: { type: String, default: null },
  purpose: { type: String, enum: ['verification_application', 'verification_renewal', 'plan_purchase', 'plan_renewal'], required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
  status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'], default: 'pending' },
  mpesaReceipt: { type: String, default: null },
  mpesaPhone: { type: String, default: null },
  confirmationCode: { type: String, default: null },
  cardLastFour: { type: String, default: null },
  gatewayResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
  refundReason: { type: String, default: null },
  refundedAt: { type: Date, default: null },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);