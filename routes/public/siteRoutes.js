import { Router } from 'express';
import { getSiteConfig, getToggles, getDownloads, getContactInfo, getMaintenanceStatus } from '../../controllers/public/siteController.js';

const router = Router();

router.get('/site/config', getSiteConfig);
router.get('/site/toggles', getToggles);
router.get('/site/downloads', getDownloads);
router.get('/site/contact', getContactInfo);
router.get('/site/maintenance', getMaintenanceStatus);

export default router;