import multer from 'multer';
import path from 'path';
import getSettings from '../../utils/getSettings.js';

const storage = multer.memoryStorage();

const fileFilter = (allowedTypes) => {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type .${ext} is not allowed. Allowed: ${allowedTypes.join(', ')}`), false);
    }
  };
};

const uploadAvatar = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: fileFilter(['jpg', 'jpeg', 'png', 'gif', 'webp']),
}).single('avatar');

const uploadPostImages = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter(['jpg', 'jpeg', 'png', 'gif', 'webp']),
}).array('images', 5);

const uploadStory = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: fileFilter(['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov']),
}).single('story');

const uploadMarketImages = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: fileFilter(['jpg', 'jpeg', 'png', 'gif', 'webp']),
}).array('images', 4);

const uploadGroupCover = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter(['jpg', 'jpeg', 'png', 'webp']),
}).single('cover');

const uploadChatFile = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: fileFilter(['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx']),
}).single('file');

const uploadVerification = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter(['jpg', 'jpeg', 'png', 'webp']),
}).single('document');

export {
  uploadAvatar,
  uploadPostImages,
  uploadStory,
  uploadMarketImages,
  uploadGroupCover,
  uploadChatFile,
  uploadVerification,
};