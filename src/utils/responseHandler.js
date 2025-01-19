const createResponse = (success, data = null, error = null) => ({
  success,
  ...(data && { data }),
  ...(error && { error })
});

module.exports = { createResponse }; 