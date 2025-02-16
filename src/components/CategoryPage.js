function CategoryPage({ category, onProductClick }) {
  const products = {
    'electronics': [
      { 
        id: 'PlayStation 5',
        name: 'PlayStation 5', 
        price: 3899,
        image: '/images/product2.jpg',
        description: 'Next-gen gaming console with stunning graphics and fast loading times.'
      }
    ],
    'sports': [
      { 
        id: 'Basketball',
        name: 'Basketball', 
        price: 229,
        image: '/images/product1.jpg',
        description: 'Professional grade basketball for indoor/outdoor use.'
      }
    ],
    'fashion': [
      { 
        id: 'T-Shirt',
        name: 'T-Shirt', 
        price: 159,
        image: '/images/product3.jpg',
        description: 'Comfortable cotton t-shirt for everyday wear.'
      }
    ]
  };

  const getProducts = () => {
    if (category === 'all') {
      return Object.entries(products).reduce((allProducts, [categoryName, categoryProducts]) => {
        return allProducts.concat(
          categoryProducts.map(product => ({
            ...product,
            category: categoryName 
          }))
        );
      }, []);
    }
    return products[category.toLowerCase()] || [];
  };

  const displayProducts = getProducts();

  return (
    <section className="category-page">
      <div className="product-grid">
        {displayProducts.map(product => (
          <article key={product.id} className="product-card">
            <a 
              href={`/${product.category || category}/${product.id}`}
              onClick={(e) => {
                e.preventDefault();
                onProductClick(product.category || category, product.id);
              }}
            >
              <figure>
                <img src={product.image} alt={product.name} className="product-thumbnail" />
                <figcaption>
                  <h3>{product.name}</h3>
                  <p className="price">HKD ${product.price.toFixed(2)}</p>
                  <p className="description">{product.description}</p>
                </figcaption>
              </figure>
            </a>
            <button className="add-to-cart" type="button" aria-label={`Add ${product.name} to cart`}>
              Add to Cart
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default CategoryPage; 
