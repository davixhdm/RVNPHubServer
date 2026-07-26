import Post from '../models/user/Post.js';
import Listing from '../models/user/Listing.js';
import Story from '../models/user/Story.js';
import Group from '../models/user/Group.js';
import Badge from '../models/user/Badge.js';
import getSettings from './getSettings.js';
import logger from './logger.js';

const getScoringWeights = async () => {
  const settings = await getSettings();
  return {
    post: settings?.scoring?.post || 3,
    comment: settings?.scoring?.comment || 1,
    helpfulAnswer: settings?.scoring?.helpfulAnswer || 5,
    listingSold: settings?.scoring?.listingSold || 4,
    lostFoundReturned: settings?.scoring?.lostFoundReturned || 10,
    groupFileUpload: settings?.scoring?.groupFileUpload || 2,
    storyPosted: settings?.scoring?.storyPosted || 1,
    repost: settings?.scoring?.repost || 2,
  };
};

const calculateUserScore = async (userId, startDate, endDate) => {
  try {
    const weights = await getScoringWeights();

    const filter = { createdAt: {} };
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);

    // Posts
    const posts = await Post.find({ author: userId, ...filter });
    let score = posts.length * weights.post;
    posts.forEach(post => {
      score += (post.commentCount || 0) * weights.comment;
      score += (post.repostCount || 0) * weights.repost;
    });

    // Helpful Q&A answers
    const helpfulAnswers = await Post.countDocuments({
      'comments.author': userId,
      'comments.helpful': true,
      ...filter,
    });
    score += helpfulAnswers * weights.helpfulAnswer;

    // Listings sold
    const listingsSold = await Listing.countDocuments({
      seller: userId,
      status: 'sold',
      updatedAt: filter.createdAt,
    });
    score += listingsSold * weights.listingSold;

    // Lost & Found returned
    const lostFoundReturned = await Post.countDocuments({
      author: userId,
      type: 'lost_found',
      status: 'claimed',
      updatedAt: filter.createdAt,
    });
    score += lostFoundReturned * weights.lostFoundReturned;

    // Group files uploaded
    const groups = await Group.find({ 'files.uploadedBy': userId });
    let groupFiles = 0;
    groups.forEach(group => {
      group.files.forEach(file => {
        const fileDate = new Date(file.uploadedAt);
        if ((!startDate || fileDate >= new Date(startDate)) &&
            (!endDate || fileDate <= new Date(endDate))) {
          groupFiles++;
        }
      });
    });
    score += groupFiles * weights.groupFileUpload;

    // Stories posted
    const stories = await Story.countDocuments({ author: userId, ...filter });
    score += stories * weights.storyPosted;

    return { success: true, score, breakdown: { posts: posts.length, helpfulAnswers, listingsSold, lostFoundReturned, groupFiles, stories } };
  } catch (error) {
    logger.error('calculateUserScore error:', error);
    return { success: false, score: 0 };
  }
};

const calculateDepartmentScore = async (department, startDate, endDate) => {
  try {
    const filter = { createdAt: {} };
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);

    const posts = await Post.find({ department, ...filter }).populate('author', 'department');
    const weights = await getScoringWeights();

    let score = posts.length * weights.post;
    posts.forEach(post => {
      score += (post.likeCount || 0) * 1;
      score += (post.commentCount || 0) * weights.comment;
      score += (post.repostCount || 0) * weights.repost;
    });

    return { success: true, score, postCount: posts.length };
  } catch (error) {
    logger.error('calculateDepartmentScore error:', error);
    return { success: false, score: 0 };
  }
};

export { calculateUserScore, calculateDepartmentScore, getScoringWeights };