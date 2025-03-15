import React, { useState, useEffect } from 'react';
import './Admin.css';

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

    useEffect(() => {
        fetchCategories();
        fetchProducts();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await fetch('http://s21.ierg4210.ie.cuhk.edu.hk/api/categories');
            const data = await response.json();
            setCategories(data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await fetch('http://s21.ierg4210.ie.cuhk.edu.hk/api/products');
            const data = await response.json();
            setProducts(data);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const handleProductSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        
        Object.keys(productForm).forEach(key => {
            if (productForm[key] !== null) {
                formData.append(key, productForm[key]);
            }
        });

        try {
            const url = editingProduct 
                ? `http://s21.ierg4210.ie.cuhk.edu.hk/api/admin/products/${editingProduct.pid}`
                : 'http://s21.ierg4210.ie.cuhk.edu.hk/api/admin/products';
            
            const method = editingProduct ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                body: formData
            });
            
            if (!response.ok) throw new Error('Failed to save product');
            
            await response.json();
            alert(editingProduct ? 'Product updated successfully!' : 'Product added successfully!');
            
            setProductForm({
                catid: '',
                name: '',
                price: '',
                description: '',
                image: null
            });
            setEditingProduct(null);
            fetchProducts();
        } catch (error) {
            console.error('Error saving product:', error);
            alert(error.message);
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setProductForm({
            catid: product.catid,
            name: product.name,
            price: product.price,
            description: product.description,
            image: null 
        });
    };

    const handleDelete = async (pid) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;

        try {
            const response = await fetch(`http://s21.ierg4210.ie.cuhk.edu.hk/api/admin/products/${pid}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete product');

            alert('Product deleted successfully!');
            fetchProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert(error.message);
        }
    };

    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://s21.ierg4210.ie.cuhk.edu.hk/api/admin/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(categoryForm)
            });
            
            if (!response.ok) {
                throw new Error('Failed to add category');
            }
            
            const data = await response.json();
            if (data.id) {
                alert('Category added successfully!');
                setCategoryForm({ name: '' });
                fetchCategories(); 
            }
        } catch (error) {
            console.error('Error adding category:', error);
            alert('Failed to add category: ' + error.message);
        }
    };

    return (
        <div className="admin-panel">
            <h1>Admin Panel</h1>
            
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
                        <input
                            type="file"
                            id="image"
                            accept="image/jpeg,image/png,image/gif"
                            onChange={(e) => setProductForm({...productForm, image: e.target.files[0]})}
                        />
                    </div>

                    <button type="submit">{editingProduct ? 'Update Product' : 'Add Product'}</button>
                    {editingProduct && (
                        <button type="button" onClick={() => {
                            setEditingProduct(null);
                            setProductForm({
                                catid: '',
                                name: '',
                                price: '',
                                description: '',
                                image: null
                            });
                        }}>Cancel Edit</button>
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
                                    <button onClick={() => handleEdit(product)}>Edit</button>
                                    <button onClick={() => handleDelete(product.pid)}>Delete</button>
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
                    <button type="submit">Add Category</button>
                </form>
            </section>
        </div>
    );
}

export default Admin; 