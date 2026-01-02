const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Імпорт маршрутів
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

const app = express();

// Middleware
app.use(helmet()); // Безпека
app.use(cors()); // CORS
app.use(morgan('dev')); // Логування
app.use(express.json()); // Парсинг JSON

// Базовий маршрут
app.get('/', (req, res) => {
  res.json({
    message: 'Простий REST API на Express.js',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile (потрібен токен)',
        users: 'GET /api/auth/users (тільки адмін)'
      },
      products: {
        getAll: 'GET /api/products',
        getOne: 'GET /api/products/:id',
        create: 'POST /api/products (потрібен токен)',
        update: 'PUT /api/products/:id (потрібен токен)',
        delete: 'DELETE /api/products/:id (потрібен токен)',
        myProducts: 'GET /api/products/user/my-products (потрібен токен)'
      }
    }
  });
});

// Додаткові тестові маршрути
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Підключення маршрутів
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// Обробка 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Маршрут не знайдено'
  });
});

// Проста обробка помилок
app.use((err, req, res, next) => {
  console.error('Помилка:', err.message);
  res.status(500).json({
    success: false,
    message: 'Щось пішло не так на сервері',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Запуск сервера
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Сервер запущено на порті ${PORT}`);
  console.log(`Адреса: http://localhost:${PORT}`);
});

module.exports = app;