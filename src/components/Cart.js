import React from 'react';
import './Cart.css';
import PayPalCheckout from './PayPalCheckout';

const API_BASE_URL = 'https://s21.ierg4210.ie.cuhk.edu.hk/api';

const Cart = ({ items, updateQuantity, removeItem }) => {
    const totalPrice = items.reduce((total, item) => total + (item.price * item.quantity), 0);

    const handleCheckoutSuccess = async (details) => {
        try {
            const response = await fetch(`${API_BASE_URL}/paypal/success`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderID: details.orderID,
                    items: items
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to process payment');
            }

            // Clear cart after successful payment
            items.forEach(item => removeItem(item.pid));
        } catch (error) {
            console.error('Payment processing error:', error);
        }
    };

    const handleCheckoutError = (error) => {
        console.error('PayPal Checkout Error:', error);
    };

    if (items.length === 0) {
        return <div className="cart-empty">Your cart is empty</div>;
    }

    return (
        <div className="cart">
            {items.map((item) => (
                <div key={item.pid} className="cart-item">
                    <img src={item.thumbnail} alt={item.name} className="cart-item-image" />
                    <div className="cart-item-details">
                        <h3>{item.name}</h3>
                        <p>HK${item.price}</p>
                        <div className="quantity-controls">
                            <button onClick={() => updateQuantity(item.pid, Math.max(0, item.quantity - 1))}>-</button>
                            <span>{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.pid, item.quantity + 1)}>+</button>
                        </div>
                        <button onClick={() => removeItem(item.pid)} className="remove-button">Remove</button>
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
        </div>
    );
};

export default Cart; 