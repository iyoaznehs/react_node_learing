const errorHandler = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';


  const errorResponse = {
    code: 1,
    msg: {
      message: err.message || 'Internal Server Error',
      ...(isDevelopment && {
        stack: err.stack.replace(/\\\\/g, '/').replace(/\\/g, '/'),
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      })
    }
  };

  // 结构化日志记录
  console.error('🚨 Error Details:', {
    code: 1,
    msg : {
      message: err.message,
      ...(isDevelopment && {
        stack: err.stack.replace(/\\\\/g, '/').replace(/\\/g, '/'),
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      })
    }
  });

  res.status(200).json(errorResponse);
};

module.exports = errorHandler;