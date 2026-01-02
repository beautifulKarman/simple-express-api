const express = require('express');
const router = express.Router();
const userModel = require('../data/users');

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

// Реєстрація нового користувача
router.post('/register', (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Перевірка обов'язкових полів
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Будь ласка, заповніть всі поля'
      });
    }

    // Перевірка чи існує користувач з таким email
    const existingUser = userModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Користувач з таким email вже існує'
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
    res.status(500).json({
      success: false,
      message: 'Помилка при реєстрації',
      error: error.message
    });
  }
});

// Вхід користувача
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    // Перевірка обов'язкових полів
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Будь ласка, введіть email та пароль'
      });
    }

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
    res.status(500).json({
      success: false,
      message: 'Помилка при вході',
      error: error.message
    });
  }
});

// Отримання профілю користувача (потрібен токен)
router.get('/profile', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Отримання всіх користувачів (тільки для адміністратора)
router.get('/users', authenticateToken, (req, res) => {
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
});

module.exports = router;