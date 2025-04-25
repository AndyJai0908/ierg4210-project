import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';

const API_BASE_URL = 'https://s21.ierg4210.ie.cuhk.edu.hk/api';

function CategoryPage({ onProductClick, onAddToCart }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { categoryId } = useParams();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const url = !categoryId || categoryId === 'all'
                    ? `${API_BASE_URL}/products`
                    : `${API_BASE_URL}/categories/${categoryId}/products`;
                
                const response = await fetch(url, {
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Product data:', data);
                
                // Ensure data is an array
                setProducts(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error:', error);
                setError('Error fetching products: ' + error.message);
                setProducts([]); // Set empty array on error
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [categoryId]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!products.length) return <div>No products found.</div>;

    return (
        <section className="category-page">
            <div className="product-grid">
                {products.map(product => (
                    <article key={product.pid} className="product-card">
                        <Link 
                            to={`/category/${product.catid}/product/${product.pid}`}
                            onClick={(e) => {
                                e.preventDefault();
                                onProductClick(product.catid, product.pid);
                            }}
                        >
                            <img 
                                src={`${API_BASE_URL}/images/products/${product.pid}/${product.thumbnail || product.image || 'default.jpg'}`}
                                alt={product.name}
                                className="product-thumbnail"
                                onError={(e) => {
                                    console.log('Image load error:', e.target.src);
                                    e.target.onerror = null;
                                    e.target.src = '/placeholder.png';
                                }}
                            />
                            <h3>{product.name}</h3>
                            <p className="price">HKD ${product.price}</p>
                            <p className="description">{product.description}</p>
                        </Link>
                        <button 
                            className="add-to-cart" 
                            type="button"
                            onClick={() => onAddToCart(product.pid)}
                        >
                            Add to Cart
                        </button>
                    </article>
                ))}
            </div>
        </section>
    );
}

export default CategoryPage; 
