// LI WAI Andy SID:1155176724
import './App.css';
import { useState } from 'react';
import CategoryPage from './components/CategoryPage';
import ProductPage from './components/ProductPage';

function App() {
  const categories = {
    'electronics': {
      name: 'Electronics',
      products: ['playstation-5']
    },
    'sports': {
      name: 'Sports',
      products: ['basketball']
    },
    'fashion': {
      name: 'Fashion',
      products: ['t-shirt']
    }
  };

  const [currentPath, setCurrentPath] = useState({
    category: '',
    product: '',
    isProductPage: false
  });

  const [cartItems, setCartItems] = useState([
    {
      id: 'playstation-5',
      name: 'PlayStation 5',
      price: 3899,
      quantity: 1
    }
  ]);

  const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

  const handleCategoryClick = (category) => {
    setCurrentPath({
      category: category,
      product: '',
      isProductPage: false
    });
  };

  const handleProductClick = (category, product) => {
    setCurrentPath({
      category: category,
      product: product,
      isProductPage: true
    });
  };

  const handleQuantityChange = (id, newQuantity) => {
    if (newQuantity < 0) return;
    
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.id === id ? { ...item, quantity: newQuantity } : item
      ).filter(item => item.quantity > 0) 
    );
  };

  const renderBreadcrumb = () => {
    if (currentPath.isProductPage) {
      return (
        <ul className="breadcrumb" aria-label="Breadcrumb navigation">
          <li><a href="/" onClick={(e) => {
            e.preventDefault();
            setCurrentPath({ category: '', product: '', isProductPage: false });
          }}>Home</a></li>
          <li><a href={`/${currentPath.category}`} onClick={(e) => {
            e.preventDefault();
            handleCategoryClick(currentPath.category);
          }}>{categories[currentPath.category.toLowerCase()].name}</a></li>
          <li><span>{currentPath.product}</span></li>
        </ul>
      );
    } else if (currentPath.category) {
      return (
        <ul className="breadcrumb" aria-label="Breadcrumb navigation">
          <li><a href="/" onClick={(e) => {
            e.preventDefault();
            setCurrentPath({ category: '', product: '', isProductPage: false });
          }}>Home</a></li>
          <li><span>{categories[currentPath.category.toLowerCase()].name}</span></li>
        </ul>
      );
    }
    return (
      <ul className="breadcrumb" aria-label="Breadcrumb navigation">
        <li><span>Home</span></li>
      </ul>
    );
  };

  const renderContent = () => {
    if (currentPath.isProductPage) {
      return <ProductPage category={currentPath.category.toLowerCase()} productId={currentPath.product} />;
    } else if (currentPath.category) {
      return <CategoryPage category={currentPath.category.toLowerCase()} onProductClick={handleProductClick} />;
    } else {
      return <CategoryPage category="all" onProductClick={handleProductClick} />;
    }
  };

  return (
    <div className="App">
      <header className="site-header">
        <nav className="nav-menu" aria-label="Main navigation">
          {renderBreadcrumb()}
          
          <aside className="shopping-cart-icon" aria-label="Shopping cart">
            🛒
            <div className="shopping-list" role="dialog" aria-label="Shopping cart contents">
              <h3>Shopping List (Total: HKD ${cartTotal})</h3>
              {cartItems.length > 0 ? (
                <>
                  <ul>
                    {cartItems.map(item => (
                      <li key={item.id}>
                        <article className="cart-item">
                          <h4>{item.name}</h4>
                          <div className="quantity-controls">
                            <button 
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              aria-label={`Decrease quantity of ${item.name}`}
                            >
                              -
                            </button>
                            <span>{item.quantity}</span>
                            <button 
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              aria-label={`Increase quantity of ${item.name}`}
                            >
                              +
                            </button>
                          </div>
                          <p className="price">HKD ${item.price * item.quantity}</p>
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
              {Object.entries(categories).map(([key, value]) => (
                <li key={key}>
                  <a 
                    href={`/${key}`} 
                    className={`category-link ${currentPath.category.toLowerCase() === key ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleCategoryClick(value.name);
                    }}
                  >
                    {value.name}
                    <span className="arrow">→</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main id="main-content">
          {renderContent()}
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

export default App;
