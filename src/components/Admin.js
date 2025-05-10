import { useState, useEffect, useCallback, useRef } from 'react';
import './Admin.css';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5000/api';

function Admin() {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [productForm, setProductForm] = useState({
        catid: '',
        name: '',
        price: '',
        description: '',
        image: null
    });
    const [categoryForm, setCategoryForm] = useState({
        name: ''
    });
    const [editingProduct, setEditingProduct] = useState(null);
    const [csrfToken, setCsrfToken] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    // Memoize functions to prevent unnecessary re-renders (optimization)
    const fetchCsrfToken = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/csrf-token`, {
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error('Failed to fetch CSRF token');
            }
            const data = await response.json();
            setCsrfToken(data.csrfToken);
            return data.csrfToken;
        } catch (error) {
            console.error('Error fetching CSRF token:', error);
            throw error;
        }
    }, []);

    const checkAuth = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/status`, {
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (!response.ok || !data.isLoggedIn || !data.isAdmin) {
                navigate('/login');
                return false;
            }
            return true;
        } catch (error) {
            console.error('Auth check failed:', error);
            navigate('/login');
            return false;
        }
    }, [navigate]);

    const fetchCategories = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/categories`, {
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setCategories(data);
        } catch (error) {
            console.error('Error fetching categories:', error);
            setError('Failed to load categories');
        }
    }, []);

    const fetchProducts = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/products`, {
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setProducts(data);
        } catch (error) {
            console.error('Error fetching products:', error);
            setError('Failed to load products');
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/orders`, {
                credentials: 'include'
            });
            const data = await response.json();
            setOrders(data);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initialize admin panel
    useEffect(() => {
        let mounted = true;
        let timeoutId;

        const initializeAdmin = async () => {
            if (!mounted) return;
            
            try {
                setLoading(true);
                const isAuthenticated = await checkAuth();
                if (!isAuthenticated || !mounted) return;
                
                await fetchCsrfToken();
                await fetchCategories();
                await fetchProducts();
            } catch (err) {
                if (mounted) {
                    console.error('Error initializing admin panel:', err);
                    setError('Failed to initialize admin panel: ' + err.message);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        // Initial load
        initializeAdmin();

        // Refresh data every 30 seconds instead of continuous polling (optimization)
        timeoutId = setInterval(initializeAdmin, 30000);

        return () => {
            mounted = false;
            if (timeoutId) {
                clearInterval(timeoutId);
            }
        };
    }, [checkAuth, fetchCsrfToken, fetchCategories, fetchProducts]);

    // Add input validation rules 
    const validateForm = (form) => {
        const errors = {};
        
        // Product name validation
        if (form.name.length < 3 || form.name.length > 100) {
            errors.name = 'Product name must be between 3 and 100 characters';
        }
        if (!/^[a-zA-Z0-9\s\-_]+$/.test(form.name)) {
            errors.name = 'Product name can only contain letters, numbers, spaces, hyphens and underscores';
        }

        // Price validation
        if (isNaN(form.price) || form.price <= 0) {
            errors.price = 'Price must be a positive number';
        }

        // Category validation
        if (!form.catid) {
            errors.catid = 'Category is required';
        }

        return errors;
    };

    const handleProductSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate form before submission
        const validationErrors = validateForm(productForm);
        if (Object.keys(validationErrors).length > 0) {
            setError(Object.values(validationErrors).join('\n'));
            return;
        }

        try {
            // Get fresh CSRF token
            const tokenResponse = await fetch(`${API_BASE_URL}/csrf-token`, {
                credentials: 'include'
            });
            if (!tokenResponse.ok) {
                throw new Error('Failed to fetch CSRF token');
            }
            const { csrfToken } = await tokenResponse.json();
            
            const formData = new FormData();
            formData.append('catid', productForm.catid);
            formData.append('name', productForm.name);
            formData.append('price', productForm.price);
            formData.append('description', productForm.description || '');
            
            if (productForm.image instanceof File) {
                formData.append('image', productForm.image);
            }

            const url = editingProduct 
                ? `${API_BASE_URL}/admin/products/${editingProduct.pid}`
                : `${API_BASE_URL}/admin/products`;
            
            const response = await fetch(url, {
                method: editingProduct ? 'PUT' : 'POST',
                body: formData,
                headers: {
                    'X-CSRF-Token': csrfToken
                },
                credentials: 'include'
            });

            if (!response.ok) {
                const data = await response.json();
                if (response.status === 401 || response.status === 403) {
                    // Try to refresh auth status
                    const isAuthenticated = await checkAuth();
                    if (!isAuthenticated) {
                        throw new Error('Authentication failed');
                    }
                    throw new Error(data.error || 'Failed to save product');
                }
                throw new Error(data.error || 'Failed to save product');
            }

            const result = await response.json();
            console.log('Product saved successfully:', result);
            
            setProductForm({
                catid: '',
                name: '',
                price: '',
                description: '',
                image: null
            });
            setEditingProduct(null);
            await fetchProducts();
            
            alert(editingProduct ? 'Product updated successfully!' : 'Product added successfully!');
        } catch (error) {
            console.error('Error saving product:', error);
            setError(error.message);
            if (error.message === 'Authentication failed') {
                navigate('/login');
            }
        }
    };

    // Handle file validation
    const validateFile = (file) => {
        // Check if file is an image
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            setError('Please upload a valid image file (JPEG, PNG, or GIF)');
            return false;
        }
        
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('File size should be less than 10MB');
            return false;
        }
        
        return true;
    };

    // Handle file selection
    const handleFileChange = (file) => {
        if (!file) return;
        
        if (validateFile(file)) {
            setError('');
            setProductForm({ ...productForm, image: file });
            
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };
    
    // Handle drag events
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };
    
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) {
            setIsDragging(true);
        }
    };
    
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            handleFileChange(file);
            e.dataTransfer.clearData();
        }
    };
    
    const handleFileInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
        }
    };
    
    // Triggered when clicking on the drop zone
    const handleDropzoneClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // Modify the form reset logic to also clear the preview
    const resetForm = () => {
        setProductForm({
            catid: '',
            name: '',
            price: '',
            description: '',
            image: null
        });
        setEditingProduct(null);
        setImagePreview(null);
    };

    // Update existing handleEdit function
    const handleEdit = (product) => {
        setEditingProduct(product);
        setProductForm({
            catid: product.catid,
            name: product.name,
            price: product.price,
            description: product.description,
            image: null 
        });
        // Reset image preview when editing a product
        setImagePreview(null);
    };

    const handleDelete = async (pid) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;

        try {
            // Get fresh CSRF token
            const tokenResponse = await fetch(`${API_BASE_URL}/csrf-token`, {
                credentials: 'include'
            });
            if (!tokenResponse.ok) {
                throw new Error('Failed to fetch CSRF token');
            }
            const { csrfToken } = await tokenResponse.json();
            
            const response = await fetch(`${API_BASE_URL}/admin/products/${pid}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                credentials: 'include'
            });

            if (!response.ok) {
                const data = await response.json();
                if (response.status === 401 || response.status === 403) {
                    // Try to refresh auth status
                    const isAuthenticated = await checkAuth();
                    if (!isAuthenticated) {
                        throw new Error('Authentication failed');
                    }
                    throw new Error(data.error || 'Failed to delete product');
                }
                throw new Error(data.error || 'Failed to delete product');
            }

            await fetchProducts();
            alert('Product deleted successfully!');
        } catch (error) {
            console.error('Error deleting product:', error);
            setError(error.message);
            if (error.message === 'Authentication failed') {
                navigate('/login');
            }
        }
    };

    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/admin/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                credentials: 'include',
                body: JSON.stringify(categoryForm)
            });
            
            if (response.status === 401 || response.status === 403) {
                // Authentication/Authorization failed
                navigate('/login');
                return;
            }
            
            if (!response.ok) {
                throw new Error(`Failed to add category: ${response.statusText}`);
            }
            
            alert('Category added successfully!');
            setCategoryForm({ name: '' });
            fetchCategories();
        } catch (error) {
            console.error('Error adding category:', error);
            setError('Failed to add category: ' + error.message);
        }
    };

    const handleCategoryDelete = async (catid) => {
        if (!window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
            return;
        }
        
        try {
            // Get fresh CSRF token
            const tokenResponse = await fetch(`${API_BASE_URL}/csrf-token`, {
                credentials: 'include'
            });
            if (!tokenResponse.ok) {
                throw new Error('Failed to fetch CSRF token');
            }
            const { csrfToken } = await tokenResponse.json();
            
            const response = await fetch(`${API_BASE_URL}/admin/categories/${catid}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                credentials: 'include'
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete category');
            }

            // Refresh categories after successful deletion
            fetchCategories();
            alert('Category deleted successfully');
        } catch (error) {
            console.error('Error deleting category:', error);
            setError(error.message);
        }
    };

    return (
        <div className="admin-container">
            {error && <div className="error-message">{error}</div>}
            <div className="admin-panel">
                <h1>Admin Panel</h1>
                
                {loading ? (
                    <div className="loading-message">Loading...</div>
                ) : (
                    <>
                        <section className="product-form">
                            <h2>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
                            <form onSubmit={handleProductSubmit}>
                                <div className="form-group">
                                    <label htmlFor="category">Category:</label>
                                    <select 
                                        id="category"
                                        value={productForm.catid}
                                        onChange={(e) => setProductForm({...productForm, catid: e.target.value})}
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat.catid} value={cat.catid}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="name">Product Name:</label>
                                    <input
                                        type="text"
                                        id="name"
                                        value={productForm.name}
                                        onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="price">Price:</label>
                                    <input
                                        type="number"
                                        id="price"
                                        value={productForm.price}
                                        onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="description">Description:</label>
                                    <textarea
                                        id="description"
                                        value={productForm.description}
                                        onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="image">Product Image:</label>
                                    <div 
                                        className={`drop-zone ${isDragging ? 'active' : ''}`}
                                        onDragEnter={handleDragEnter}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={handleDropzoneClick}
                                    >
                                        <input
                                            type="file"
                                            id="image"
                                            ref={fileInputRef}
                                            className="file-input"
                                            accept="image/jpeg,image/png,image/gif"
                                            onChange={handleFileInputChange}
                                        />
                                        
                                        {imagePreview ? (
                                            <div className="image-preview-container">
                                                <img 
                                                    src={imagePreview} 
                                                    alt="Preview" 
                                                    className="image-preview" 
                                                />
                                                <button 
                                                    type="button" 
                                                    className="remove-image" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setImagePreview(null);
                                                        setProductForm({...productForm, image: null});
                                                    }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="drop-zone-prompt">
                                                <p>Drag & Drop an image here or click to select</p>
                                                <p className="drop-zone-hint">Supported formats: JPEG, PNG, GIF</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button type="submit" disabled={loading}>
                                    {editingProduct ? 'Update Product' : 'Add Product'}
                                </button>
                                {editingProduct && (
                                    <button 
                                        type="button" 
                                        onClick={resetForm}
                                        disabled={loading}
                                    >
                                        Cancel Edit
                                    </button>
                                )}
                            </form>
                        </section>

                        <section className="products-list">
                            <h2>Products</h2>
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Category</th>
                                        <th>Price</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(product => (
                                        <tr key={product.pid}>
                                            <td>{product.pid}</td>
                                            <td>{product.name}</td>
                                            <td>{categories.find(c => c.catid === product.catid)?.name}</td>
                                            <td>HKD ${product.price}</td>
                                            <td>
                                                <button 
                                                    onClick={() => handleEdit(product)}
                                                    disabled={loading}
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(product.pid)}
                                                    disabled={loading}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <section className="category-form">
                            <h2>Add Category</h2>
                            <form onSubmit={handleCategorySubmit}>
                                <div className="form-group">
                                    <label htmlFor="categoryName">Category Name:</label>
                                    <input
                                        type="text"
                                        id="categoryName"
                                        value={categoryForm.name}
                                        onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                                        required
                                    />
                                </div>
                                <button type="submit" disabled={loading}>Add Category</button>
                            </form>
                        </section>

                        <section className="admin-panel-categories-list">
                            <h2>Categories</h2>
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map(category => (
                                        <tr key={category.catid}>
                                            <td>{category.catid}</td>
                                            <td>{category.name}</td>
                                            <td>
                                                <button 
                                                    onClick={() => handleCategoryDelete(category.catid)}
                                                    disabled={loading}
                                                    className="delete-button"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <div className="orders-section">
                            <h2>Orders</h2>
                            {loading ? (
                                <p>Loading orders...</p>
                            ) : (
                                <div className="orders-table-container">
                                    <table className="orders-table">
                                        <thead>
                                            <tr>
                                                <th>Order ID</th>
                                                <th>Username</th>
                                                <th>Products</th>
                                                <th>Total Amount</th>
                                                <th>Status</th>
                                                <th>Created At</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders.map((order) => (
                                                <tr key={order.orderId}>
                                                    <td>{order.orderId}</td>
                                                    <td>{order.username}</td>
                                                    <td>
                                                        <ul className="order-products">
                                                            {order.products.map((product, index) => (
                                                                <li key={index}>
                                                                    {product} - {order.currency} ${order.prices[index].toFixed(2)}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </td>
                                                    <td>{order.currency} ${order.totalAmount.toFixed(2)}</td>
                                                    <td>
                                                        <span className={`status-badge ${order.status.toLowerCase()}`}>
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default Admin; 