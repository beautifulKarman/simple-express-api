// Масив продуктів
let products = [
  {
    id: 1,
    name: "Ноутбук Dell XPS 13",
    description: "Потужний ультрабук з екраном 13 дюймів",
    price: 45000,
    category: "electronics",
    inStock: true,
    quantity: 15,
    createdBy: 1,
    createdAt: "2024-01-05T09:00:00Z"
  },
  {
    id: 2,
    name: "Смартфон iPhone 15",
    description: "Флагманський смартфон від Apple",
    price: 55000,
    category: "electronics",
    inStock: true,
    quantity: 25,
    createdBy: 2,
    createdAt: "2024-01-06T10:30:00Z"
  },
  {
    id: 3,
    name: "Футболка чорна",
    description: "Бавовняна футболка класичного крою",
    price: 800,
    category: "clothing",
    inStock: true,
    quantity: 50,
    createdBy: 1,
    createdAt: "2024-01-07T11:45:00Z"
  },
  {
    id: 4,
    name: "Книга 'JavaScript для початківців'",
    description: "Повний посібник з вивчення JavaScript",
    price: 600,
    category: "books",
    inStock: false,
    quantity: 0,
    createdBy: 3,
    createdAt: "2024-01-08T14:20:00Z"
  },
  {
    id: 5,
    name: "Навушники Sony WH-1000XM4",
    description: "Бездротові навушники з шумозаглушенням",
    price: 12000,
    category: "electronics",
    inStock: true,
    quantity: 8,
    createdBy: 2,
    createdAt: "2024-01-09T16:10:00Z"
  }
];

// Функції для роботи з продуктами
const productModel = {
  // Отримати всі продукти
  getAll: (filters = {}) => {
    let filteredProducts = [...products];

    // Фільтрація по категорії
    if (filters.category) {
      filteredProducts = filteredProducts.filter(p => p.category === filters.category);
    }

    // Фільтрація по наявності
    if (filters.inStock !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.inStock === (filters.inStock === 'true'));
    }

    // Пошук по назві або опису
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredProducts = filteredProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm)
      );
    }

    // Сортування
    if (filters.sort) {
      switch (filters.sort) {
        case 'price_asc':
          filteredProducts.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          filteredProducts.sort((a, b) => b.price - a.price);
          break;
        case 'newest':
          filteredProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
        case 'oldest':
          filteredProducts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          break;
      }
    }

    // Пагінація
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    return {
      products: paginatedProducts,
      total: filteredProducts.length,
      page,
      totalPages: Math.ceil(filteredProducts.length / limit),
      hasNextPage: endIndex < filteredProducts.length,
      hasPrevPage: startIndex > 0
    };
  },

  // Знайти продукт по ID
  findById: (id) => {
    return products.find(p => p.id === parseInt(id));
  },

  // Додати новий продукт
  create: (productData) => {
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;

    const newProduct = {
      id: newId,
      ...productData,
      createdAt: new Date().toISOString()
    };

    products.push(newProduct);
    return newProduct;
  },

  // Оновити продукт
  update: (id, productData) => {
    const index = products.findIndex(p => p.id === parseInt(id));
    if (index === -1) return null;

    products[index] = { ...products[index], ...productData };
    return products[index];
  },

  // Видалити продукт
  delete: (id) => {
    const index = products.findIndex(p => p.id === parseInt(id));
    if (index === -1) return false;

    products.splice(index, 1);
    return true;
  },

  // Отримати продукти користувача
  getByUser: (userId) => {
    return products.filter(p => p.createdBy === parseInt(userId));
  }
};

module.exports = productModel;