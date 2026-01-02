const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Імпорт нових middleware
const { 
  securityHeaders, 
  apiRateLimiter,
  authRateLimiter,
  createRateLimiter,
  checkOriginHeader
} = require('./middleware/securityMiddleware');
const { sanitizeInput, preventNoSQLInjection } = require('./middleware/validationMiddleware');
const { 
  xssFilterOutput, 
  validateContentType,
  validatePayloadSize 
} = require('./middleware/xssFilter');

// Імпорт маршрутів
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

const app = express();

// Безпечні заголовки
app.use(helmet({
  contentSecurityPolicy: false // Відключаємо стандартну CSP, бо маємо власну
}));
app.use(securityHeaders);

// Налаштування CORS
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 години
};
app.use(cors(corsOptions));

// Логування
app.use(morgan('combined'));

// Валідація та санація
app.use(validateContentType);
app.use(validatePayloadSize('5mb'));
app.use(sanitizeInput);
app.use(preventNoSQLInjection);

// Парсинг JSON з обмеженням розміру
app.use(express.json({
  limit: '5mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// XSS захист для вихідних даних
app.use(xssFilterOutput);

// Базовий маршрут
app.get('/',
  apiRateLimiter,
  (req, res) => {
    res.json({
      message: 'Захищений REST API на Express.js',
      version: '2.0.0',
      security: {
        cors: true,
        csp: true,
        xss: true,
        rateLimiting: true,
        sqlInjection: true,
        noSqlInjection: true,
        ddos: true
      }
    });
  }
);

// Статус сервера
app.get('/api/status',
  apiRateLimiter,
  (req, res) => {
    res.json({
      status: 'online',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      security: 'enabled'
    });
  }
);

// Маршрути аутентифікації з жорсткішим rate limiting
app.use('/api/auth',
  authRateLimiter,
  checkOriginHeader,
  authRoutes
);

// Маршрути продуктів
app.use('/api/products',
  apiRateLimiter,
  checkOriginHeader,
  productRoutes
);

// Ендпоінт для перевірки безпеки
app.get('/api/security/check',
  apiRateLimiter,
  (req, res) => {
    const securityInfo = {
      headers: {
        csp: req.get('Content-Security-Policy') ? 'Встановлено' : 'Відсутній',
        xssProtection: req.get('X-XSS-Protection') ? 'Встановлено' : 'Відсутній',
        contentTypeOptions: req.get('X-Content-Type-Options') ? 'Встановлено' : 'Відсутній',
        frameOptions: req.get('X-Frame-Options') ? 'Встановлено' : 'Відсутній',
        cors: 'Встановлено'
      },
      cookies: {
        httponly: 'Встановлено для всіх cookie',
        secure: process.env.NODE_ENV === 'production' ? 'Так' : 'Тільки для HTTPS'
      },
      rateLimiting: {
        enabled: true,
        limits: {
          auth: '5 запитів за 15 хвилин',
          api: '100 запитів за хвилину',
          create: '10 запитів за годину'
        }
      },
      validation: {
        inputSanitization: 'Включено',
        xssFilter: 'Включено',
        noSqlInjection: 'Включено',
        requestSize: 'Обмежено до 5MB'
      }
    };

    res.json({
      success: true,
      security: securityInfo
    });
  }
);

// Обробка 404
app.use('*',
  apiRateLimiter,
  (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Маршрут не знайдено',
      securityNote: 'Всі маршрути захищені'
    });
  }
);

// Обробка помилок з додатковою безпекою
app.use((err, req, res, next) => {
  console.error('Помилка:', err.message);

  // Не показуємо деталі помилок у продакшені
  const errorMessage = process.env.NODE_ENV === 'development' 
    ? err.message 
    : 'Внутрішня помилка сервера';

  // Додаткові заголовки безпеки при помилках
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  res.status(err.status || 500).json({
    success: false,
    message: errorMessage,
    timestamp: new Date().toISOString()
  });
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`✅ Захищений сервер запущено на порті ${PORT}`);
  console.log(`🔒 Режим безпеки: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Адреса: http://localhost:${PORT}`);
  console.log(`🛡️  Захист увімкнено: XSS, NoSQL Injection, Rate Limiting, CORS`);
});

// Обробка непередбачених помилок
process.on('uncaughtException', (error) => {
  console.error('Непередбачена помилка:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Необроблена відмова:', reason);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Отримано сигнал завершення. Закриття сервера...');
  server.close(() => {
    console.log('Сервер зупинено.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Примусове завершення...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;