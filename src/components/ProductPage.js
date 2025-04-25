import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';

const API_BASE_URL = 'https://s21.ierg4210.ie.cuhk.edu.hk/api';

function ProductPage({ onAddToCart }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { productId } = useParams();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null); // Clear any previous errors
        
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Product not found');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Fetched product:', data); // Debug log
        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
        setError(error.message || 'Error fetching product details');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <section className="product-page">
      <article className="product-detail">
        <div className="product-image">
          <img 
            src={product.image 
              ? `${API_BASE_URL}/images/products/${product.image}`
              : '/images/placeholder.jpg'
            } 
            alt={product.name} 
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/images/placeholder.jpg';
            }}
          />
        </div>
        <div className="product-info">
          <h1>{DOMPurify.sanitize(product.name)}</h1>
          <p className="price">HKD ${parseFloat(product.price).toFixed(2)}</p>
          <div className="description">
            <h2>Description</h2>
            <div 
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(product.description)
              }}
            />
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
