import { PayPalButtons } from "@paypal/react-paypal-js";
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

            const orderData = await response.json();
            
            if (response.ok) {
                return orderData.id;
            } else {
                throw new Error(orderData.error || "Failed to create order.");
            }
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const onApprove = async (data, actions) => {
        try {
            const response = await fetch(`${API_BASE_URL}/paypal/capture-order`, {
                method: "POST",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    orderID: data.orderID
                }),
            });

            const orderData = await response.json();
            
            if (response.ok) {
                onSuccess(orderData);
            } else {
                throw new Error(orderData.error || "Failed to capture order.");
            }
        } catch (err) {
            setError(err.message);
            onError(err);
        }
    };

    return (
        <div className="paypal-button-container">
            {error && <div className="error-message">{error}</div>}
            <PayPalButtons
                createOrder={createOrder}
                onApprove={onApprove}
                onError={(err) => {
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
        </div>
    );
};

export default PayPalCheckout; 