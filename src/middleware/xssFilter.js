const validator = require('validator');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Фільтр XSS для вихідних даних
const xssFilterOutput = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (data && typeof data === 'object') {
      // Рекурсивно фільтруємо всі строки в об'єкті
      const sanitizeData = (obj) => {
        if (!obj) return obj;
        
        if (typeof obj === 'string') {
          // Використовуємо DOMPurify для очищення HTML
          return DOMPurify.sanitize(obj, {
            ALLOWED_TAGS: [], // Не дозволяємо жодні теги
            ALLOWED_ATTR: [] // Не дозволяємо жодні атрибути
          });
        }
        
        if (Array.isArray(obj)) {
          return obj.map(item => sanitizeData(item));
        }
        
        if (typeof obj === 'object' && obj !== null) {
          const sanitized = {};
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              sanitized[key] = sanitizeData(obj[key]);
            }
          }
          return sanitized;
        }
        
        return obj;
      };
      
      data = sanitizeData(data);
    }
    
    originalJson.call(this, data);
  };
  
  next();
};

// Middleware для перевірки Content-Type
const validateContentType = (req, res, next) => {
  const allowedContentTypes = ['application/json', 'application/x-www-form-urlencoded'];
  
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.headers['content-type'];
    
    if (!contentType || !allowedContentTypes.some(type => contentType.includes(type))) {
      return res.status(415).json({
        success: false,
        message: 'Непідтримуваний тип контенту'
      });
    }
  }
  
  next();
};

// Перевірка розміру тіла запиту
const validatePayloadSize = (maxSize = '5mb') => {
  return (req, res, next) => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const maxBytes = parseSize(maxSize);
      if (parseInt(contentLength) > maxBytes) {
        return res.status(413).json({
          success: false,
          message: 'Тіло запиту занадто велике'
        });
      }
    }
    
    next();
  };
};

// Допоміжна функція для парсингу розміру
function parseSize(size) {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.match(/^(\d+)([a-z]+)$/i);
  if (!match) return 5 * 1024 * 1024; // 5MB за замовчуванням
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  return value * (units[unit] || 1);
}

module.exports = {
  xssFilterOutput,
  validateContentType,
  validatePayloadSize
};