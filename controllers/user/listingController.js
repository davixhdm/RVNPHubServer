import Listing from '../../models/user/Listing.js';
import User from '../../models/user/User.js';
import * as moderationService from '../../services/moderationService.js';
import * as cloudinaryService from '../../services/cloudinaryService.js';
import * as socketService from '../../services/socketService.js';
import * as pushService from '../../services/pushService.js';
import * as emailService from '../../services/emailService.js';
import paginate from '../../utils/paginate.js';
import { success, created } from '../../utils/responseHandler.js';
import { AppError } from '../../utils/errorHandler.js';
import getSettings from '../../utils/getSettings.js';
import logger from '../../utils/logger.js';

// GET /api/market
const getListings = async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings?.toggles?.marketplace) throw new AppError('Marketplace is currently disabled', 403, 'MARKET_DISABLED');
    const query = { status: 'active', moderationStatus: { $ne: 'removed' } };
    if (req.query.category && req.query.category !== 'all') query.category = req.query.category;
  const result = await paginate(Listing, query, {
  page: req.query.page, limit: 20, sort: { createdAt: -1 },
  populate: { path: 'seller', select: 'firstName lastName avatar hdmVerified hostel' },
});
    return success(res, result.data, 'Listings', 200, { pagination: result.pagination });
  } catch (error) { next(error); }
};

// GET /api/market/:id
const getListingById = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('seller', 'firstName lastName avatar hdmVerified hostel department');
    if (!listing) throw new AppError('Listing not found', 404, 'NOT_FOUND');
    return success(res, listing, 'Listing detail');
  } catch (error) { next(error); }
};

// POST /api/market
const createListing = async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings?.toggles?.marketplace) throw new AppError('Marketplace is currently disabled', 403, 'MARKET_DISABLED');

    const user = await User.findById(req.user._id);
    const activeListings = await Listing.countDocuments({ seller: req.user._id, status: 'active' });
    if (user.maxListings !== -1 && activeListings >= user.maxListings) {
      throw new AppError(`Max ${user.maxListings} listings on your plan`, 403, 'MAX_LISTINGS');
    }

    // Upload images
    let images = [];
    if (req.files?.length > 0) {
      const upload = await cloudinaryService.uploadMarketImages(req.files, req.user._id);
      if (upload.success) images = upload.urls;
    }

    const moderation = await moderationService.reviewContent(
      (req.body.title || '') + ' ' + (req.body.description || ''), images[0]
    );

    const listing = await Listing.create({
      seller: req.user._id,
      title: req.body.title,
      description: req.body.description || '',
      price: Number(req.body.price) || 0,
      category: req.body.category || 'other',
      condition: req.body.condition || 'good',
      location: req.body.location || req.user.hostel || '',
      images,
      moderationStatus: moderation.status === 'removed' ? 'removed' : 'approved',
    });

    return created(res, listing, 'Listing created');
  } catch (error) { next(error); }
};

// PATCH /api/market/:id
const updateListing = async (req, res, next) => {
  try {
    const listing = await Listing.findOneAndUpdate(
      { _id: req.params.id, seller: req.user._id },
      {
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        category: req.body.category,
        condition: req.body.condition,
        location: req.body.location,
      },
      { new: true }
    );
    if (!listing) throw new AppError('Listing not found', 404, 'NOT_FOUND');
    return success(res, listing, 'Listing updated');
  } catch (error) { next(error); }
};

// DELETE /api/market/:id
const deleteListing = async (req, res, next) => {
  try {
    const listing = await Listing.findOneAndDelete({ _id: req.params.id, seller: req.user._id });
    if (!listing) throw new AppError('Listing not found', 404, 'NOT_FOUND');
    if (listing.images?.length > 0) {
      const publicIds = listing.images.map(url => {
        const parts = url.split('/');
        const filename = parts[parts.length - 1].split('.')[0];
        return `hdm-rvnp/market/${filename}`;
      });
      await cloudinaryService.deleteFiles(publicIds);
    }
    return success(res, null, 'Listing deleted');
  } catch (error) { next(error); }
};

// POST /api/market/:id/interested
const markInterested = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) throw new AppError('Listing not found', 404, 'NOT_FOUND');
    if (!listing.interested.includes(req.user._id)) {
      listing.interested.push(req.user._id);
      listing.interestedCount = listing.interested.length;
      await listing.save();
    }
    const seller = await User.findById(listing.seller);
    if (seller) {
      socketService.listingInterested(seller._id, { listingId: listing._id, buyer: req.user.firstName });
      await pushService.sendToUser(seller._id, pushService.buildMarketInterestNotification(req.user.firstName, listing.title));
      await emailService.sendListingInterestEmail(seller, req.user.firstName, listing.title, listing._id);
    }
    return success(res, null, 'Interest marked');
  } catch (error) { next(error); }
};

// PATCH /api/market/:id/sold
const markAsSold = async (req, res, next) => {
  try {
    const listing = await Listing.findOneAndUpdate(
      { _id: req.params.id, seller: req.user._id },
      { status: 'sold', buyer: req.body.buyerId },
      { new: true }
    );
    if (!listing) throw new AppError('Listing not found', 404, 'NOT_FOUND');
    const seller = await User.findById(req.user._id);
    await emailService.sendListingSoldEmail(seller, listing.title, listing.price);
    return success(res, listing, 'Marked as sold');
  } catch (error) { next(error); }
};

// POST /api/market/:id/rate
const rateTransaction = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) throw new AppError('Listing not found', 404, 'NOT_FOUND');
    if (req.user._id.toString() === listing.seller.toString()) {
      listing.buyerRating = req.body.rating;
    } else if (req.user._id.toString() === listing.buyer?.toString()) {
      listing.sellerRating = req.body.rating;
    }
    await listing.save();
    return success(res, null, 'Rating saved');
  } catch (error) { next(error); }
};

// GET /api/market/my/listings
const getMyListings = async (req, res, next) => {
  try {
    const listings = await Listing.find({ seller: req.user._id }).sort({ createdAt: -1 });
    return success(res, listings, 'My listings');
  } catch (error) { next(error); }
};

// POST /api/market/:id/report
const reportListing = async (req, res, next) => {
  try {
    const Report = (await import('../../models/admin/Report.js')).default;
    await Report.create({
      reportedBy: req.user._id, reportedContent: req.params.id,
      contentType: 'listing', reportType: req.body.type, description: req.body.description,
    });
    return success(res, null, 'Report submitted');
  } catch (error) { next(error); }
};

export {
  getListings, getListingById, createListing, updateListing, deleteListing,
  markInterested, markAsSold, rateTransaction, getMyListings, reportListing,
};