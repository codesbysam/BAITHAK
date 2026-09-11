/**
 * Global error handler middleware.
 */
function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.url}:`, err);
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = {
  errorHandler,
};
