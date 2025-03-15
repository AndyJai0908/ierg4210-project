import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';

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
                    ? 'http://localhost:5000/api/products'
                    : `http://localhost:5000/api/categories/${categoryId}/products`;
                
                const response = await fetch(url);
                const data = await response.json();
                setProducts(data);
            } catch (error) {
                setError('Error fetching products');
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [categoryId]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

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
                                src={product.thumbnail 
                                    ? `http://localhost:5000/images/products/${product.thumbnail}`
                                    : '/images/placeholder.jpg'
                                } 
                                alt={product.name} 
                                className="product-thumbnail"
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
