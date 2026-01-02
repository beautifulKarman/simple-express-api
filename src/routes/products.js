const express = require('express');
const router = express.Router();
const productModel = require('../data/products');
const userModel = require('../data/users');

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

// Отримати всі продукти (публічний доступ)
router.get('/', (req, res) => {
  try {
    const filters = req.query;
    const result = productModel.getAll(filters);

    res.json({
      success: true,
      count: result.products.length,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
      data: result.products
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Помилка при отриманні продуктів',
      error: error.message
    });
  }
});

// Отримати один продукт (публічний доступ)
router.get('/:id', (req, res) => {
  try {
    const product = productModel.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Продукт не знайдено'
      });
    }

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Помилка при отриманні продукту',
      error: error.message
    });
  }
});

// Створити новий продукт (потрібен токен)
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, description, price, category, quantity } = req.body;

    // Перевірка обов'язкових полів
    if (!name || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Будь ласка, заповніть всі обов\'язкові поля'
      });
    }

    // Створення продукту
    const newProduct = productModel.create({
      name,
      description,
      price: parseFloat(price),
      category,
      quantity: quantity ? parseInt(quantity) : 0,
      inStock: quantity ? parseInt(quantity) > 0 : false,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Продукт успішно створено',
      data: newProduct
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Помилка при створенні продукту',
      error: error.message
    });
  }
});

// Оновити продукт (потрібен токен)
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const product = productModel.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Продукт не знайдено'
      });
    }

    // Перевірка прав доступу
    if (product.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Недостатньо прав для оновлення продукту'
      });
    }

    // Оновлення продукту
    const updatedProduct = productModel.update(req.params.id, req.body);

    if (!updatedProduct) {
      return res.status(500).json({
        success: false,
        message: 'Помилка при оновленні продукту'
      });
    }

    res.json({
      success: true,
      message: 'Продукт успішно оновлено',
      data: updatedProduct
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Помилка при оновленні продукту',
      error: error.message
    });
  }
});

// Видалити продукт (потрібен токен)
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const product = productModel.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Продукт не знайдено'
      });
    }

    // Перевірка прав доступу
    if (product.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Недостатньо прав для видалення продукту'
      });
    }

    // Видалення продукту
    const deleted = productModel.delete(req.params.id);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Помилка при видаленні продукту'
      });
    }

    res.json({
      success: true,
      message: 'Продукт успішно видалено'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Помилка при видаленні продукту',
      error: error.message
    });
  }
});

// Отримати продукти поточного користувача
router.get('/user/my-products', authenticateToken, (req, res) => {
  try {
    const userProducts = productModel.getByUser(req.user.id);

    res.json({
      success: true,
      count: userProducts.length,
      data: userProducts
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Помилка при отриманні продуктів',
      error: error.message
    });
  }
});

module.exports = router;