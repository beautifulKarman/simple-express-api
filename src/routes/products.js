const express = require('express');
const router = express.Router();
const productModel = require('../data/products');
const userModel = require('../data/users');
const {
  validateRequest,
  productValidation,
  sanitizeInput,
  preventNoSQLInjection,
  validateIdParam
} = require('../middleware/validationMiddleware');
const {
  createRateLimiter,
  apiRateLimiter
} = require('../middleware/securityMiddleware');

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

// Отримати всі продукти (публічний доступ) з валідацією query параметрів
router.get('/',
  apiRateLimiter,
  (req, res) => {
    try {
      // Валідація query параметрів
      const filters = {};
      
      if (req.query.category) {
        const validCategories = ['electronics', 'clothing', 'books', 'food', 'other'];
        if (!validCategories.includes(req.query.category)) {
          return res.status(400).json({
            success: false,
            message: 'Невірна категорія'
          });
        }
        filters.category = req.query.category;
      }
      
      if (req.query.inStock) {
        if (req.query.inStock !== 'true' && req.query.inStock !== 'false') {
          return res.status(400).json({
            success: false,
            message: 'Невірне значення для inStock'
          });
        }
        filters.inStock = req.query.inStock;
      }
      
      if (req.query.search) {
        // Обмеження довжини пошукового запиту
        if (req.query.search.length > 100) {
          return res.status(400).json({
            success: false,
            message: 'Пошуковий запит занадто довгий'
          });
        }
        filters.search = req.query.search;
      }
      
      if (req.query.sort) {
        const validSorts = ['price_asc', 'price_desc', 'newest', 'oldest'];
        if (!validSorts.includes(req.query.sort)) {
          return res.status(400).json({
            success: false,
            message: 'Невірний параметр сортування'
          });
        }
        filters.sort = req.query.sort;
      }
      
      if (req.query.page) {
        const page = parseInt(req.query.page);
        if (isNaN(page) || page < 1) {
          return res.status(400).json({
            success: false,
            message: 'Невірний номер сторінки'
          });
        }
        filters.page = page;
      }
      
      if (req.query.limit) {
        const limit = parseInt(req.query.limit);
        if (isNaN(limit) || limit < 1 || limit > 100) {
          return res.status(400).json({
            success: false,
            message: 'Ліміт має бути від 1 до 100'
          });
        }
        filters.limit = limit;
      }
      
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
      console.error('Get products error:', error);
      res.status(500).json({
        success: false,
        message: 'Помилка при отриманні продуктів',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Отримати один продукт з валідацією ID
router.get('/:id',
  apiRateLimiter,
  (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id) || id < 1) {
        return res.status(400).json({
          success: false,
          message: 'Невірний ID продукту'
        });
      }

      const product = productModel.findById(id);

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
      console.error('Get product error:', error);
      res.status(500).json({
        success: false,
        message: 'Помилка при отриманні продукту',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Створити новий продукт з валідацією
router.post('/',
  authenticateToken,
  createRateLimiter,
  sanitizeInput,
  preventNoSQLInjection,
  validateRequest(productValidation),
  (req, res) => {
    try {
      const { name, description, price, category, quantity } = req.body;

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
      console.error('Create product error:', error);
      res.status(500).json({
        success: false,
        message: 'Помилка при створенні продукту',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Оновити продукт з валідацією
router.put('/:id',
  authenticateToken,
  sanitizeInput,
  preventNoSQLInjection,
  validateRequest(productValidation),
  (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id) || id < 1) {
        return res.status(400).json({
          success: false,
          message: 'Невірний ID продукту'
        });
      }

      const product = productModel.findById(id);

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
      const updatedProduct = productModel.update(id, req.body);

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
      console.error('Update product error:', error);
      res.status(500).json({
        success: false,
        message: 'Помилка при оновленні продукту',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Видалити продукт
router.delete('/:id',
  authenticateToken,
  (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id) || id < 1) {
        return res.status(400).json({
          success: false,
          message: 'Невірний ID продукту'
        });
      }

      const product = productModel.findById(id);

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
      const deleted = productModel.delete(id);

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
      console.error('Delete product error:', error);
      res.status(500).json({
        success: false,
        message: 'Помилка при видаленні продукту',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Отримати продукти поточного користувача
router.get('/user/my-products',
  authenticateToken,
  apiRateLimiter,
  (req, res) => {
    try {
      const userProducts = productModel.getByUser(req.user.id);

      res.json({
        success: true,
        count: userProducts.length,
        data: userProducts
      });

    } catch (error) {
      console.error('Get user products error:', error);
      res.status(500).json({
        success: false,
        message: 'Помилка при отриманні продуктів',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;