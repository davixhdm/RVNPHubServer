import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import { uploadMarketImages } from '../../middleware/user/upload.js';
import validateObjectId from '../../middleware/user/validateObjectId.js';
import sanitizeBody from '../../middleware/user/sanitizeBody.js';
import {
  getListings, getListingById, createListing, updateListing, deleteListing,
  markInterested, markAsSold, rateTransaction, getMyListings, reportListing,
} from '../../controllers/user/listingController.js';

const router = Router();

router.get('/market', auth(), getListings);
router.get('/market/my/listings', auth(), getMyListings);
router.get('/market/:id', auth(), validateObjectId('id'), getListingById);
router.post('/market', auth(), uploadMarketImages, sanitizeBody, createListing);
router.patch('/market/:id', auth(), validateObjectId('id'), sanitizeBody, updateListing);
router.delete('/market/:id', auth(), validateObjectId('id'), deleteListing);
router.post('/market/:id/interested', auth(), validateObjectId('id'), markInterested);
router.patch('/market/:id/sold', auth(), validateObjectId('id'), markAsSold);
router.post('/market/:id/rate', auth(), validateObjectId('id'), rateTransaction);
router.post('/market/:id/report', auth(), validateObjectId('id'), reportListing);

export default router;