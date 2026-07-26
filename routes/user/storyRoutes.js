import { Router } from 'express';
import auth from '../../middleware/user/auth.js';
import { uploadStory } from '../../middleware/user/upload.js';
import validateObjectId from '../../middleware/user/validateObjectId.js';
import {
  getStories, createStory, deleteStory, viewStory,
  getStoryViewers, reactToStory, createDepartmentStory, reportStory,
} from '../../controllers/user/storyController.js';

const router = Router();

router.get('/stories', auth(), getStories);
router.post('/stories', auth(), uploadStory, createStory);
router.delete('/stories/:id', auth(), validateObjectId('id'), deleteStory);
router.post('/stories/:id/view', auth(), validateObjectId('id'), viewStory);
router.get('/stories/:id/viewers', auth(), validateObjectId('id'), getStoryViewers);
router.post('/stories/:id/react', auth(), validateObjectId('id'), reactToStory);
router.post('/stories/department', auth(), uploadStory, createDepartmentStory);
router.post('/stories/:id/report', auth(), validateObjectId('id'), reportStory);

export default router;