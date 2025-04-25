import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import React, { useState } from 'react';

const API_BASE_URL = 'https://s21.ierg4210.ie.cuhk.edu.hk/api';

const PayPalCheckout = ({ items, onSuccess, onError }) => {
    const [error, setError] = useState(null);

    const createOrder = async () => {
        try {
            // Get CSRF token
            const csrfResponse = await fetch(`${API_BASE_URL}/csrf-token`, {
                credentials: 'include'
            });
            const { csrfToken } = await csrfResponse.json();

            console.log('Creating order with items:', items);
            
            // Create order
            const response = await fetch(`${API_BASE_URL}/paypal/create-order`, {
                method: "POST",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json",
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    items: items.map(item => ({
                        pid: item.pid,
                        quantity: item.quantity,
                        price: item.price,
                        name: item.name
                    }))
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to create order.");
            }

            const orderData = await response.json();
            console.log('Order created:', orderData);
            
            return orderData.id;
        } catch (err) {
            console.error('Create order error:', err);
            setError(err.message);
            throw err;
        }
    };

    const onApprove = async (data, actions) => {
        try {
            console.log('Order approved:', data);
            // Successfully created the order
            onSuccess(data);
            return true;
        } catch (err) {
            console.error('Approval error:', err);
            setError(err.message);
            onError(err);
        }
    };

    return (
        <div className="paypal-button-container">
            {error && <div className="error-message">{error}</div>}
            <PayPalScriptProvider options={{ 
                "client-id": "AQH9km_w6wEGbdgGhbLmPmMMZxEmqbUC0zz0Mg9y9RFz2UZAkLnQU7lD_8S5g5XnXrKtEe8dGbOUKR9z", // Sandbox client ID - replace with yours
                currency: "HKD",
                intent: "capture"
            }}>
                <PayPalButtons
                    createOrder={createOrder}
                    onApprove={onApprove}
                    onError={(err) => {
                        console.error('PayPal button error:', err);
                        setError(err.message);
                        onError(err);
                    }}
                    style={{
                        layout: "horizontal",
                        color: "gold",
                        shape: "rect",
                        label: "pay"
                    }}
                />
            </PayPalScriptProvider>
        </div>
    );
};

export default PayPalCheckout; 