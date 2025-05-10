import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './MemberPortal.css';

const MemberPortal = ({ onLogout }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuthAndFetchOrders = async () => {
            try {
                // First check if user is logged in
                const authResponse = await fetch('https://s21.ierg4210.ie.cuhk.edu.hk/api/auth/status', {
                    credentials: 'include'
                });
                
                const authData = await authResponse.json();
                setIsLoggedIn(authData.isLoggedIn);
                setUser(authData.user);
                
                // And only fetch orders if user is logged in
                if (authData.isLoggedIn) {
                    // Get CSRF token
                    const csrfResponse = await fetch('https://s21.ierg4210.ie.cuhk.edu.hk/api/csrf-token', {
                        credentials: 'include'
                    });
                    const { csrfToken } = await csrfResponse.json();

                    // Fetch orders
                    const response = await fetch('https://s21.ierg4210.ie.cuhk.edu.hk/api/auth/orders', {
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': csrfToken
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    setOrders(data);
                }
            } catch (error) {
                console.error('Error:', error);
                setError('Failed to load orders. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        checkAuthAndFetchOrders();
    }, []);

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        } else {
            console.error('Logout function not provided');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-HK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-HK', {
            style: 'currency',
            currency: 'HKD'
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="loading">
                <div>Loading...</div>
            </div>
        );
    }

    // Show guest welcome screen if not logged in
    if (!isLoggedIn) {
        return (
            <div className="member-portal">
                <div className="member-welcome">
                    <h2>Welcome to the Member Portal</h2>
                    <p>Sign in to view your orders and manage your account</p>
                    <div className="action-buttons">
                        <button onClick={() => navigate('/login')} className="action-button">
                            Login
                        </button>
                        <button onClick={() => navigate('/register')} className="action-button register">
                            Register
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    // Logged in user screen
    return (
        <div className="member-portal">
            <div className="member-header">
                <h2>My Account</h2>
                <div className="account-actions">
                    <button onClick={() => navigate('/change-password')} className="action-button">
                        Change Password
                    </button>
                    <button onClick={handleLogout} className="action-button logout">
                        Logout
                    </button>
                </div>
            </div>
            
            <div className="member-info">
                <p>Welcome, <span className="user-email">{user?.email}</span></p>
            </div>
            
            <h3 className="section-title">Recent Orders</h3>
            
            {error && (
                <div className="error">
                    <p>{error}</p>
                </div>
            )}
            
            {orders.length === 0 ? (
                <div className="no-orders">
                    <p>You don't have any orders yet</p>
                </div>
            ) : (
                <div className="orders-list">
                    <table>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Date</th>
                                <th>Products</th>
                                <th>Total Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.orderId}>
                                    <td>{order.orderId}</td>
                                    <td>{formatDate(order.createdAt)}</td>
                                    <td>
                                        <ul className="order-products">
                                            {order.products.map((product, index) => (
                                                <li key={index}>
                                                    {product} x {order.quantities[index]} @ {formatCurrency(order.prices[index])}
                                                </li>
                                            ))}
                                        </ul>
                                    </td>
                                    <td>{formatCurrency(order.totalAmount)}</td>
                                    <td>
                                        <span className={`order-status ${order.status.toLowerCase()}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MemberPortal; 