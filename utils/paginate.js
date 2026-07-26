import getSettings from './getSettings.js';

const paginate = async (model, query = {}, options = {}) => {
  const settings = await getSettings();

  const {
    page = 1,
    limit = settings?.limits?.postsPerPage || 20,
    sort = { createdAt: -1 },
    select = '',
    populate = '',
  } = options;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [data, totalItems] = await Promise.all([
    model.find(query).sort(sort).skip(skip).limit(limitNum).select(select).populate(populate),
    model.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalItems / limitNum);

  return {
    success: true,
    data,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
      limit: limitNum,
    },
  };
};

export default paginate;