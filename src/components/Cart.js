import React, { useState } from 'react';
import './Cart.css';
import PayPalCheckout from './PayPalCheckout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'https://s21.ierg4210.ie.cuhk.edu.hk/api';

const Cart = ({ items, onUpdateQuantity, onRemoveItem }) => {
    const [isOpen, setIsOpen] = useState(false);
    const totalPrice = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const itemCount = items.reduce((count, item) => count + item.quantity, 0);

    const handleCheckoutSuccess = (orderData) => {
        console.log('Checkout successful!', orderData);
        // Clear cart after successful checkout
        items.forEach(item => onRemoveItem(item.pid));
    };

    const handleCheckoutError = (error) => {
        console.error('PayPal Checkout Error:', error);
    };

    // Toggle dropdown menu
    const toggleCart = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className="cart-icon-container">
            <div className="cart-icon" onClick={toggleCart}>
                <FontAwesomeIcon icon={faShoppingCart} />
                {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
            </div>
            
            <div className={`cart-dropdown ${isOpen ? 'open' : ''}`}>
                <h2>Shopping Cart</h2>
                {items.length === 0 ? (
                    <p className="empty-cart-message">Your cart is empty</p>
                ) : (
                    <>
                        {items.map((item) => (
                            <div key={item.pid} className="cart-item">
                                <img src={`${API_BASE_URL}/image/${item.image || 'placeholder.jpg'}`} alt={item.name} className="cart-item-image" />
                                <div className="cart-item-details">
                                    <h3>{item.name}</h3>
                                    <p className="item-price">HK${parseFloat(item.price).toFixed(2)}</p>
                                    <div className="quantity-controls">
                                        <button 
                                            className="qty-btn minus"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateQuantity(item.pid, Math.max(1, item.quantity - 1));
                                            }}
                                        >
                                            -
                                        </button>
                                        <span className="quantity">{item.quantity}</span>
                                        <button 
                                            className="qty-btn plus"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateQuantity(item.pid, item.quantity + 1);
                                            }}
                                        >
                                            +
                                        </button>
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveItem(item.pid);
                                        }} 
                                        className="remove-button"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="cart-total">
                            <h3>Total: HK${totalPrice.toFixed(2)}</h3>
                            <PayPalCheckout 
                                items={items}
                                onSuccess={handleCheckoutSuccess}
                                onError={handleCheckoutError}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Cart; 