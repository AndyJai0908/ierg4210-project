import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';

const API_BASE_URL = 'https://s21.ierg4210.ie.cuhk.edu.hk/api';

function CategoryPage({ onProductClick, onAddToCart }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { categoryId } = useParams();
    
    // Pagination state (phase 6)
    const [page, setPage] = useState(1);
    const [limit] = useState(12);
    const [hasMore, setHasMore] = useState(true);
    
    // Infinite scroll setup (phase 6)
    const observer = useRef();
    const lastProductElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    // Reset when category changes (phase 6)
    useEffect(() => {
        setProducts([]);
        setPage(1);
        setHasMore(true);
    }, [categoryId]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                setError(null);

                const url = !categoryId || categoryId === 'all'
                    ? `${API_BASE_URL}/products?page=${page}&limit=${limit}`
                    : `${API_BASE_URL}/categories/${categoryId}/products?page=${page}&limit=${limit}`;
                
                console.log(`Fetching from: ${url}`); // for debugging
                
                const response = await fetch(url, {
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Handle both response formats, since old format not working sometimes (phase 6)
                let newProducts = [];
                
                if (Array.isArray(data)) {
                    // Old format - direct array of products (phase 6)
                    newProducts = data;
                    setHasMore(data.length >= limit);
                } else if (data.products && Array.isArray(data.products)) {
                    // New format - products nested in object with pagination (phase 6)
                    newProducts = data.products;
                    setHasMore(page < data.pagination.pages);
                } else {
                    console.error('Unexpected API response format:', data);
                    throw new Error('Unexpected API response format');
                }
                
                // Update products state (phase 6)
                setProducts(prevProducts => {
                    if (page === 1) {
                        // First page - replace products (phase 6)
                        return [...newProducts];
                    } else {
                        // Additional pages - append unique products (phase 6)
                        const uniqueProducts = [...prevProducts];
                        
                        newProducts.forEach(newProduct => {
                            if (!uniqueProducts.some(p => p.pid === newProduct.pid)) {
                                uniqueProducts.push(newProduct);
                            }
                        });
                        
                        return uniqueProducts;
                    }
                });
                
            } catch (error) {
                console.error('Error fetching products:', error);
                setError('Error fetching products: ' + error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [categoryId, page, limit]);

    if (error) return <div className="error-message">{error}</div>;
    if (!products.length && !loading) return <div>No products found.</div>;

    return (
        <section className="category-page">
            <div className="product-grid">
                {products.map((product, index) => {
                    // Add ref to last element for infinite scroll (phase 6)
                    const isLastElement = products.length === index + 1;
                    
                    return ( 
                        <article 
                            key={product.pid} 
                            className="product-card"
                            ref={isLastElement ? lastProductElementRef : null}
                        >
                            <Link 
                                to={`/category/${product.catid}/product/${product.pid}`} 
                                onClick={(e) => {
                                    e.preventDefault();
                                    onProductClick(product.catid, product.pid);
                                }}
                            >
                                <img 
                                    src={`${API_BASE_URL}/image/${product.image || product.thumbnail}`}
                                    alt={product.name}
                                    className="product-thumbnail"
                                    onError={(e) => {
                                        if (e.target.src.includes(product.image) && product.thumbnail && product.image !== product.thumbnail) {
                                            e.target.src = `${API_BASE_URL}/image/${product.thumbnail}`;
                                        } 
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
                    );
                })}
            </div>
            
            {loading && (
                <div className="loading-indicator">
                    <div className="loading-spinner"></div>
                </div>
            )}
        </section>
    );
}

export default CategoryPage; 
