function notFound(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Page or endpoint not found.' },
  });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 500
    ? err.status
    : 500;

  res.status(status).json({
    error: {
      code: status < 500 ? 'INVALID_REQUEST' : 'INTERNAL_ERROR',
      message: status < 500 ? 'Invalid request.' : 'An unexpected error occurred.',
    },
  });
}

module.exports = { notFound, errorHandler };
