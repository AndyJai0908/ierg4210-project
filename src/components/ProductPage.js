function ProductPage({ category, productId }) {
  const normalizedProductId = productId.toLowerCase().replace(/ /g, '-');
  
  const products = {
    'electronics': {
      'playstation-5': { 
        name: 'PlayStation 5',
        price: 3899,
        image: '/images/product2.jpg',
        description: 'Next-gen gaming console with stunning graphics and fast loading times.',
        fullDescription: `Sony's next-generation gaming console, offering ultra-fast loading, stunning 4K graphics, and an immersive gaming experience with its innovative DualSense controller.`
      }
    },
    'sports': {
      'basketball': {  
        name: 'Basketball',
        price: 229,
        image: '/images/product1.jpg',
        description: 'Professional grade basketball for indoor/outdoor use.',
        fullDescription: `Official size and weight basketball  for both indoor and outdoor play.`
      }
    },
    'fashion': {
      't-shirt': {  
        name: 'T-Shirt',
        price: 159,
        image: '/images/product3.jpg',
        description: 'Comfortable cotton t-shirt for everyday wear.',
        fullDescription: `Premium quality cotton t-shirt designed for maximum comfort and style.`
      }
    }
  };

  console.log('Category:', category);
  console.log('ProductId:', normalizedProductId);
  console.log('Available products:', products[category.toLowerCase()]);

  const product = products[category.toLowerCase()]?.[normalizedProductId];

  return (
    <section className="product-page">
      <article className="product-detail">
        <div className="product-image">
          <img src={product.image} alt={product.name} />
        </div>
        <div className="product-info">
          <h1>{product.name}</h1>
          <p className="price">HKD ${product.price.toFixed(2)}</p>
          <div className="description">
            <h2>Description</h2>
            <p>{product.fullDescription}</p>
          </div>
          <button className="add-to-cart" type="button">Add to Cart</button>
        </div>
      </article>
    </section>
  );
}

export default ProductPage; 
