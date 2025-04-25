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
            src={`${API_BASE_URL}/image/${product.image || product.thumbnail}`}
            alt={product.name}
            className="product-image"
            onError={(e) => {
                console.log('Image load error:', e.target.src);
                e.target.onerror = null;
                
                // Try thumbnail if image failed
                if (e.target.src.includes(product.image) && product.thumbnail && product.image !== product.thumbnail) {
                    e.target.src = `${API_BASE_URL}/image/${product.thumbnail}`;
                } else {
                    // Fallback to a base64 placeholder
                    e.target.src = "data:image/png;base64,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";
                }
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
