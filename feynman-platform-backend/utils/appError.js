// msg, stack, 
class AppError extends Error {
  constructor(message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    if (this.stack) {
      this.stack = this.stack.replace(/\\/g, '/'); 
    }
  }
}

module.exports = AppError;