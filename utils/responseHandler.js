const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const created = (res, data = null, message = 'Created successfully') => {
  return success(res, data, message, 201);
};

const noContent = (res, message = 'No content') => {
  return res.status(204).json({
    success: true,
    message,
    timestamp: new Date().toISOString(),
  });
};

const paginated = (res, paginationResult, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data: paginationResult.data,
    pagination: paginationResult.pagination,
    timestamp: new Date().toISOString(),
  });
};

export { success, created, noContent, paginated };