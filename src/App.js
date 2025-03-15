// IERG4210 Project 
// LI WAI Andy SID:1155176724

import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import './App.css';
import { useState, useEffect } from 'react';
import CategoryPage from './components/CategoryPage';
import ProductPage from './components/ProductPage';
import Admin from './components/Admin';
import { ShoppingCart } from './utils/ShoppingCart';

const API_BASE_URL = 'http://s21.ierg4210.ie.cuhk.edu.hk/api';

function AppContent() {
  const [categories, setCategories] = useState({});
  const [cart] = useState(() => new ShoppingCart());
  const [cartItems, setCartItems] = useState([]);
  const navigate = useNavigate();
  const params = useParams();
  const [currentProduct, setCurrentProduct] = useState(null);
  const location = window.location.pathname;

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        const data = await response.json();
        const categoryObj = data.reduce((acc, cat) => {
          acc[cat.catid] = {
            name: cat.name,
            products: []
          };
          return acc;
        }, {});
        setCategories(categoryObj);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch product details when needed for breadcrumb
  useEffect(() => {
    const fetchProduct = async () => {
      const pathSegments = location.split('/').filter(Boolean);
      if (pathSegments[0] === 'category' && pathSegments[2] === 'product' && pathSegments[3]) {
        try {
          const response = await fetch(`${API_BASE_URL}/products/${pathSegments[3]}`);
          const data = await response.json();
          setCurrentProduct(data);
        } catch (error) {
          console.error('Error fetching product:', error);
        }
      } else {
        setCurrentProduct(null);
      }
    };
    fetchProduct();
  }, [location]);

  // Update cart display whenever it changes
  useEffect(() => {
    const updateCartDisplay = async () => {
      const items = cart.getItems();
      setCartItems(items);
    };
    updateCartDisplay();
  }, [cart]);

  const handleCategoryClick = (categoryId) => {
    navigate(`/category/${categoryId}`);
  };

  const handleProductClick = (categoryId, productId) => {
    navigate(`/category/${categoryId}/product/${productId}`);
  };

  const handleAddToCart = async (pid) => {
    await cart.addItem(pid, 1);
    setCartItems(cart.getItems());
  };

  const handleQuantityChange = async (pid, newQuantity) => {
    if (newQuantity < 0) return;
    cart.updateQuantity(pid, newQuantity);
    setCartItems(cart.getItems());
  };

  const renderBreadcrumb = () => {
    const crumbs = [];
    
    crumbs.push(
      <li key="home">
        <a href="/" onClick={(e) => {
          e.preventDefault();
          navigate('/');
        }}>Home</a>
      </li>
    );

    const pathSegments = location.split('/').filter(Boolean);
    
    if (pathSegments.length > 0) {
      switch(pathSegments[0]) {
        case 'category':
          // Add category
          if (pathSegments[1] && categories[pathSegments[1]]) {
            crumbs.push(
              <li key="category">
                <a href={`/category/${pathSegments[1]}`} onClick={(e) => {
                  e.preventDefault();
                  navigate(`/category/${pathSegments[1]}`);
                }}>{categories[pathSegments[1]].name}</a>
              </li>
            );
          }
          
          // Add product
          if (pathSegments[2] === 'product' && currentProduct) {
            crumbs.push(
              <li key="product">
                <span>{currentProduct.name}</span>
              </li>
            );
          }
          break;
        case 'admin':
          crumbs.push(
            <li key="admin">
              <span>Admin Panel</span>
            </li>
          );
          break;
        default:
          break;
      }
    }

    return (
      <ul className="breadcrumb" aria-label="Breadcrumb navigation">
        {crumbs}
      </ul>
    );
  };

  return (
    <div className="App">
      <header className="site-header">
        <nav className="nav-menu" aria-label="Main navigation">
          {renderBreadcrumb()}
          
          <aside className="shopping-cart-icon" aria-label="Shopping cart">
            🛒
            <div className="shopping-list" role="dialog" aria-label="Shopping cart contents">
              <h3>Shopping List (Total: HKD ${cart.getTotal()})</h3>
              {cartItems.length > 0 ? (
                <>
                  <ul>
                    {cartItems.map(item => (
                      <li key={item.pid}>
                        <article className="cart-item">
                          <h4>{item.name}</h4>
                          <div className="quantity-controls">
                            <button 
                              onClick={() => handleQuantityChange(item.pid, item.quantity - 1)}
                              aria-label={`Decrease quantity of ${item.name}`}
                            >
                              -
                            </button>
                            <span>{item.quantity}</span>
                            <button 
                              onClick={() => handleQuantityChange(item.pid, item.quantity + 1)}
                              aria-label={`Increase quantity of ${item.name}`}
                            >
                              +
                            </button>
                          </div>
                          <p className="price">HKD ${item.getTotal()}</p>
                        </article>
                      </li>
                    ))}
                  </ul>
                  <button className="checkout-btn" type="button">Checkout</button>
                </>
              ) : (
                <p>Your cart is empty</p>
              )}
            </div>
          </aside>
        </nav>
      </header>

      <div className="main-container">
        <aside className="categories-sidebar">
          <h2>Categories</h2>
          <nav aria-label="Categories navigation">
            <ul className="categories-list">
              {Object.entries(categories).map(([catid, category]) => (
                <li key={catid}>
                  <a 
                    href={`/category/${catid}`}
                    className={`category-link ${params.categoryId === catid ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleCategoryClick(catid);
                    }}
                  >
                    {category.name}
                    <span className="arrow">→</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main id="main-content">
          <Routes>
            <Route path="/" element={<CategoryPage category="all" onProductClick={handleProductClick} onAddToCart={handleAddToCart} />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/category/:categoryId" element={<CategoryPage onProductClick={handleProductClick} onAddToCart={handleAddToCart} />} />
            <Route path="/category/:categoryId/product/:productId" element={<ProductPage onAddToCart={handleAddToCart} />} />
          </Routes>
        </main>
      </div>

      <footer>
        <section className="footer-content">
          <h2>About Our Store</h2>
          <p>Designed by LI WAI</p>
          <p>SID:1155176724</p>
        </section>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
