import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function ProductPage({ onAddToCart }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { productId } = useParams();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/products/${productId}`);
        if (!response.ok) {
          throw new Error('Product not found');
        }
        const data = await response.json();
        console.log('Fetched product:', data); // Debug log
        setProduct(data);
      } catch (error) {
        setError('Error fetching product details');
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <section className="product-page">
      <article className="product-detail">
        <div className="product-image">
          <img 
            src={product.image 
              ? `http://localhost:5000/images/products/${product.image}`
              : '/images/placeholder.jpg'
            } 
            alt={product.name} 
          />
        </div>
        <div className="product-info">
          <h1>{product.name}</h1>
          <p className="price">HKD ${product.price}</p>
          <div className="description">
            <h2>Description</h2>
            <p>{product.description}</p>
          </div>
          <button 
            className="add-to-cart" 
            type="button"
            onClick={() => onAddToCart(product.pid)}
          >
            Add to Cart
          </button>
        </div>
      </article>
    </section>
  );
}

export default ProductPage; 
