import { Router } from 'express';
import { getTermsOfService, getPrivacyPolicy, getCommunityGuidelines, getMarketplacePolicy, getAllLegals } from '../../controllers/public/legalController.js';

const router = Router();

router.get('/legal', getAllLegals);
router.get('/legal/terms', getTermsOfService);
router.get('/legal/privacy', getPrivacyPolicy);
router.get('/legal/guidelines', getCommunityGuidelines);
router.get('/legal/marketplace', getMarketplacePolicy);

export default router;