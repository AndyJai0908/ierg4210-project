// IERG4210 Project 
// LI WAI Andy SID:1155176724

import { Routes, Route, useNavigate, useParams, Navigate, Link } from 'react-router-dom';
import './App.css';
import { useState, useEffect } from 'react';
import CategoryPage from './components/CategoryPage';
import ProductPage from './components/ProductPage';
import Admin from './components/Admin';
import { ShoppingCart } from './utils/ShoppingCart';
import Login from './components/Login';
import ChangePassword from './components/ChangePassword';
import Cart from './components/Cart';
import MemberPortal from './components/MemberPortal';

const API_BASE_URL = 'https://s21.ierg4210.ie.cuhk.edu.hk/api';

// Payment result components
const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = window.location;
  
  useEffect(() => {
    const updateOrderStatus = async () => {
      const params = new URLSearchParams(location.search);
      const invoice = params.get('invoice');
      
      if (invoice) {
        try {
          const response = await fetch(`http://localhost:5000/api/paypal/success?invoice=${invoice}`, {
            credentials: 'include'
          });
          if (!response.ok) {
            console.error('Failed to update order status');
          }
        } catch (error) {
          console.error('Error updating order status:', error);
        }
      }
    };
    
    updateOrderStatus();
  }, [location]);
  
  return (
    <div className="payment-result success">
      <h2>Payment Successful!</h2>
      <p>Thank you for your purchase.</p>
      <button onClick={() => navigate('/')}>Continue Shopping</button>
    </div>
  );
};

const PaymentCancelled = () => {
  const navigate = useNavigate();
  
  return (
    <div className="payment-result cancelled">
      <h2>Payment Cancelled</h2>
      <p>Your payment was cancelled. No charges were made.</p>
      <button onClick={() => navigate('/')}>Return to Shop</button>
    </div>
  );
};

function AppContent() {
  const [categories, setCategories] = useState({});
  const [cart] = useState(() => new ShoppingCart());
  const [cartItems, setCartItems] = useState([]);
  const navigate = useNavigate();
  const params = useParams();
  const [currentProduct, setCurrentProduct] = useState(null);
  const location = window.location.pathname;
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState([]);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/status`, {
        credentials: 'include'
      });
      const data = await response.json();
      setIsLoggedIn(data.isLoggedIn);
      setIsAdmin(data.isAdmin);
      setUser(data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsLoggedIn(false);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/products`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/categories`, { credentials: 'include' })
        ]);

        const products = await productsRes.json();
        const categories = await categoriesRes.json();

        setProducts(products);
        setCategories(categories);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
    checkAuthStatus();
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
    const updateCartDisplay = () => {
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

  const handleUpdateQuantity = (pid, quantity) => {
    cart.updateQuantity(pid, quantity);
    setCartItems(cart.getItems());
  };

  const handleRemoveItem = (pid) => {
    cart.removeItem(pid);
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

  // Protected route component
  const ProtectedRoute = ({ children, adminOnly = false }) => {
    if (!user) {
      return <Navigate to="/login" />;
    }
    if (adminOnly && !user.isAdmin) {
      return <Navigate to="/" />;
    }
    return children;
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        setUser(null);
        navigate('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="App">
      <header className="site-header">
        <nav className="nav-menu" aria-label="Main navigation">
          {renderBreadcrumb()}
          
          <div className="nav-auth">
            {user ? (
              <>
                <span className="user-info">Welcome, {user.email}</span>
                {user.isAdmin && <Link to="/admin" className="nav-link">Admin</Link>}
                <Link to="/member-portal" className="member-portal-button">My Orders</Link>
                <Link to="/change-password" className="nav-link">Change Password</Link>
                <button onClick={handleLogout} className="logout-button">Logout</button>
              </>
            ) : (
              <>
                <Link to="/member-portal" className="member-portal-button">Check Orders</Link>
                <Link to="/login" className="login-button">Login</Link>
              </>
            )}
          </div>
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
            <Route path="/admin" element={
              <ProtectedRoute adminOnly={true}>
                <Admin />
              </ProtectedRoute>
            } />
            <Route path="/member-portal" element={<MemberPortal />} />
            <Route path="/category/:categoryId" element={<CategoryPage onProductClick={handleProductClick} onAddToCart={handleAddToCart} />} />
            <Route path="/category/:categoryId/product/:productId" element={<ProductPage onAddToCart={handleAddToCart} />} />
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/change-password" element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            } />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-cancelled" element={<PaymentCancelled />} />
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

      <Cart 
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
      />
    </div>
  );
}

function App() {
  return (
    <AppContent />
  );
}

export default App;
