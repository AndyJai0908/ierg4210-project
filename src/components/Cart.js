import React from 'react';
import './Cart.css';
import PayPalCheckout from './PayPalCheckout';


const Cart = ({ items, onUpdateQuantity, onRemoveItem }) => {
    const totalPrice = items.reduce((total, item) => total + (item.price * item.quantity), 0);

    const handleCheckoutSuccess = (orderData) => {
        console.log('Checkout successful', orderData);
        items.forEach(item => onRemoveItem(item.pid));
    };

    const handleCheckoutError = (error) => {
        console.error('PayPal Checkout Error:', error);
    };

    return (
        <div className="cart">
            <h2>Shopping Cart</h2>
            {items.length === 0 ? (
                <p>Your cart is empty</p>
            ) : (
                <>
                    {items.map((item) => (
                        <div key={item.pid} className="cart-item">
                            <div className="cart-item-details">
                                <h3>{item.name}</h3>
                                <p>HK${item.price}</p>
                                <div className="quantity-controls">
                                    <button onClick={() => onUpdateQuantity(item.pid, Math.max(0, item.quantity - 1))}>-</button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => onUpdateQuantity(item.pid, item.quantity + 1)}>+</button>
                                </div>
                                <button onClick={() => onRemoveItem(item.pid)} className="remove-button">Remove</button>
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
    );
};

export default Cart; 