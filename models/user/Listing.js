import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 100 },
  description: { type: String, maxlength: 1000, default: '' },
  images: [{ type: String }],
  price: { type: Number, required: true },
  currency: { type: String, default: 'KSh' },
  category: { type: String, enum: ['textbooks', 'tools', 'electronics', 'hostel', 'clothing', 'other'], default: 'other' },
  condition: { type: String, enum: ['like_new', 'good', 'fair', 'poor'], default: 'good' },
  location: { type: String, default: null },
  status: { type: String, enum: ['active', 'sold', 'reserved', 'removed'], default: 'active' },
  interested: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  interestedCount: { type: Number, default: 0 },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  sellerRating: { type: Number, min: 1, max: 5, default: null },
  buyerRating: { type: Number, min: 1, max: 5, default: null },
  moderationStatus: { type: String, enum: ['approved', 'flagged', 'removed'], default: 'approved' },
}, { timestamps: true });

listingSchema.index({ seller: 1 });
listingSchema.index({ category: 1, status: 1 });
listingSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Listing', listingSchema);