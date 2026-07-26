import axios from 'axios';
import logger from '../utils/logger.js';

const HDM_AI_API_KEY = process.env.HDM_AI_API_KEY;
const HDM_AI_API_URL = process.env.HDM_AI_API_URL;

const hdmAIClient = axios.create({
  baseURL: HDM_AI_API_URL,
  headers: {
    Authorization: `Bearer ${HDM_AI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

const moderateContent = async (text, imageUrl) => {
  try {
    const body = {};
    if (text) body.text = text;
    if (imageUrl) body.imageUrl = imageUrl;

    const response = await hdmAIClient.post('/projects/rvnp/moderate', body);
    return { success: true, ...response.data };
  } catch (error) {
    logger.error('AI moderation error:', error.response?.data || error.message);
    return { success: false, flagged: false, reason: 'ai_error', confidence: 0, categories: {} };
  }
};

const scanVerificationDoc = async (imageUrl) => {
  try {
    const response = await hdmAIClient.post('/projects/rvnp/verify-document', { imageUrl });
    return { success: true, ...response.data };
  } catch (error) {
    logger.error('AI document scan error:', error.response?.data || error.message);
    return { success: false, valid: false, reason: 'ai_error', confidence: 0 };
  }
};

const getSuggestedReplies = async (chatContext) => {
  try {
    const response = await hdmAIClient.post('/projects/rvnp/suggest-replies', { chatContext });
    return { success: true, suggestions: response.data?.suggestions || [] };
  } catch (error) {
    logger.error('AI suggestions error:', error.response?.data || error.message);
    return { success: false, suggestions: [] };
  }
};

const rankFeedItems = async (posts, userInterests, userDepartment, userHostel) => {
  try {
    const response = await hdmAIClient.post('/projects/rvnp/rank-feed', {
      posts,
      userInterests: userInterests || [],
      userDepartment: userDepartment || '',
      userHostel: userHostel || '',
    });
    return { success: true, rankedPosts: response.data?.rankedPosts || posts };
  } catch (error) {
    logger.error('AI feed ranking error:', error.response?.data || error.message);
    return { success: false, rankedPosts: posts };
  }
};

const detectTrendingTopics = async (posts) => {
  try {
    const response = await hdmAIClient.post('/projects/rvnp/trending', { posts });
    return { success: true, topics: response.data?.topics || [] };
  } catch (error) {
    logger.error('AI trending error:', error.response?.data || error.message);
    return { success: false, topics: [] };
  }
};

const generalChat = async (message, systemPrompt) => {
  try {
    const body = { message };
    if (systemPrompt) body.system_prompt = systemPrompt;

    const response = await hdmAIClient.post('/projects/rvnp/chat', body);
    return { success: true, ...response.data };
  } catch (error) {
    logger.error('AI chat error:', error.response?.data || error.message);
    return { success: false, reply: 'AI service unavailable', error: error.message };
  }
};

logger.info('HDM AI configured');
export { moderateContent, scanVerificationDoc, getSuggestedReplies, rankFeedItems, detectTrendingTopics, generalChat };