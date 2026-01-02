const express = require('express');
const router = express.Router();
const userModel = require('../data/users');
const {
  validateRequest,
  registerValidation,
  loginValidation,
  sanitizeInput,
  preventNoSQLInjection
} = require('../middleware/validationMiddleware');
const {
  authRateLimiter,
  createRateLimiter
} = require('../middleware/securityMiddleware');

// Простий токен генератор
const generateToken = (userId) => {
  return `fake-jwt-token-${userId}-${Date.now()}`;
};

// Middleware для перевірки токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Токен не надано'
    });
  }

  const user = userModel.verifyToken(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Невірний токен'
    });
  }

  req.user = user;
  next();
};

// Реєстрація нового користувача з валідацією
router.post('/register',
  authRateLimiter,
  sanitizeInput,
  preventNoSQLInjection,
  validateRequest(registerValidation),
  (req, res) => {
    try {
      const { username, email, password } = req.body;

      // Перевірка чи існує користувач з таким email
      const existingUser = userModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Користувач з таким email вже існує'
        });
      }

      // Перевірка чи існує користувач з таким username
      const existingUsername = userModel.getAll().find(u => u.username === username);
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          message: 'Користувач з таким іменем вже існує'
        });
      }

      // Створення користувача
      const newUser = userModel.create({
        username,
        email,
        password
      });

      // Генерація токена
      const token = generateToken(newUser.id);
      userModel.saveToken(newUser.id, token);

      res.status(201).json({
        success: true,
        message: 'Користувач успішно зареєстрований',
        token,
        user: newUser
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Помилка при реєстрації',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Вхід користувача з валідацією
router.post('/login',
  authRateLimiter,
  sanitizeInput,
  preventNoSQLInjection,
  validateRequest(loginValidation),
  (req, res) => {
    try {
      const { email, password } = req.body;

      // Пошук користувача
      const user = userModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Невірний email або пароль'
        });
      }

      // Перевірка пароля
      if (!userModel.checkPassword(user, password)) {
        return res.status(401).json({
          success: false,
          message: 'Невірний email або пароль'
        });
      }

      // Генерація токена
      const token = generateToken(user.id);
      userModel.saveToken(user.id, token);

      // Приховуємо пароль у відповіді
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: 'Успішний вхід',
        token,
        user: userWithoutPassword
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Помилка при вході',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Отримання профілю користувача (потрібен токен)
router.get('/profile', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Отримання всіх користувачів (тільки для адміністратора)
router.get('/users',
  authenticateToken,
  (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Недостатньо прав'
      });
    }

    const allUsers = userModel.getAll();
    res.json({
      success: true,
      count: allUsers.length,
      users: allUsers
    });
  }
);

// Оновлення профілю
router.put('/profile',
  authenticateToken,
  sanitizeInput,
  preventNoSQLInjection,
  (req, res) => {
    try {
      const { username, email } = req.body;
      
      // Перевірка даних
      if (username && username.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Ім\'я користувача має бути не менше 3 символів'
        });
      }
      
      if (email && !validator.isEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Невірний формат email'
        });
      }
      
      // Оновлення користувача
      const updatedUser = userModel.update(req.user.id, req.body);
      
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'Користувач не знайдений'
        });
      }
      
      res.json({
        success: true,
        message: 'Профіль успішно оновлено',
        user: updatedUser
      });
      
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({
        success: false,
        message: 'Помилка при оновленні профілю'
      });
    }
  }
);

module.exports = router;