const helmet = require('helmet');

// Розширені налаштування Helmet
const securityHeaders = (req, res, next) => {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none'; " +
    "form-action 'self';"
  );

  // X-XSS-Protection (застаріле, але для сумісності)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Referrer-Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions-Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

// Захист від Clickjacking
const preventClickjacking = (req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
};

// Захист від MIME sniffing
const preventMIMESniffing = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
};

// Захист від XSS через заголовки
const xssProtection = (req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

// Загальний rate limiter для API
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 хвилина
  max: 100, // 100 запитів за хвилину
  message: {
    success: false,
    message: 'Забагато запитів. Спробуйте через хвилину.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Більш строгий rate limiter для аутентифікації
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 5, // 5 спроб за 15 хвилин
  message: {
    success: false,
    message: 'Забагато спроб входу. Спробуйте пізніше.'
  }
});

// Rate limiter для створення контенту
const createRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 година
  max: 10, // 10 запитів за годину
  message: {
    success: false,
    message: 'Забагато запитів на створення. Спробуйте через годину.'
  }
});

// CSRF protection middleware
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// Middleware для перевірки заголовків
const checkOriginHeader = (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:5000'];
  
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      success: false,
      message: 'Доступ заборонено'
    });
  }
  
  next();
};

module.exports = {
  securityHeaders,
  preventClickjacking,
  preventMIMESniffing,
  xssProtection,
  apiRateLimiter,
  authRateLimiter,
  createRateLimiter,
  csrfProtection,
  checkOriginHeader
};