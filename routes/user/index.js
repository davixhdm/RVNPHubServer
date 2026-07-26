import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import postRoutes from './postRoutes.js';
import storyRoutes from './storyRoutes.js';
import chatRoutes from './chatRoutes.js';
import messageRoutes from './messageRoutes.js';
import groupRoutes from './groupRoutes.js';
import listingRoutes from './listingRoutes.js';
import badgeRoutes from './badgeRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import leaderboardRoutes from './leaderboardRoutes.js';
import subscriptionRoutes from './subscriptionRoutes.js';
import searchRoutes from './searchRoutes.js';
import friendRoutes from './friendRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import privacyRoutes from './privacyRoutes.js';
import supportRoutes from './supportRoutes.js';



const router = Router();

router.use('/auth', authRoutes);
router.use(userRoutes);
router.use(postRoutes);
router.use(storyRoutes);
router.use(chatRoutes);
router.use(messageRoutes);
router.use(groupRoutes);
router.use(listingRoutes);
router.use(badgeRoutes);
router.use(notificationRoutes);
router.use(leaderboardRoutes);
router.use(subscriptionRoutes);
router.use(searchRoutes);
router.use(friendRoutes);
router.use(settingsRoutes);
router.use(privacyRoutes);
router.use(supportRoutes);

export default router;