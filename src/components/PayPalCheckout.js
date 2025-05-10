import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'https://s21.ierg4210.ie.cuhk.edu.hk/api';

function PayPalCheckout({ items, onSuccess, onError }) {
    const [loading, setLoading] = useState(false);
    const [csrfToken, setCsrfToken] = useState('');
    const [error, setError] = useState(null);

    // Fetch CSRF token
    useEffect(() => {
        const fetchCsrfToken = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/csrf-token`, {
                    credentials: 'include'
                });
                const data = await response.json();
                setCsrfToken(data.csrfToken);
            } catch (error) {
                console.error('Error fetching CSRF token:', error);
                setError('Failed to fetch CSRF token');
            }
        };

        fetchCsrfToken();
    }, []);

    const handleCheckout = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // create an order on server
            const response = await fetch(`${API_BASE_URL}/paypal/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                credentials: 'include',
                body: JSON.stringify({
                    items: items.map(item => ({
                        item_name: item.name,
                        item_number: item.pid,
                        quantity: item.quantity,
                        amount: item.price
                    }))
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create PayPal order');
            }

            const orderData = await response.json();
            
            if (!orderData.success) {
                throw new Error(orderData.error || 'Failed to create order');
            }

            // Update form with order data
            document.getElementById('paypal-invoice').value = orderData.orderId;
            document.getElementById('paypal-custom').value = orderData.digest;

            // Update return URLs with order ID
            document.getElementById('paypal-return').value = `${window.location.origin}/payment-success?invoice=${orderData.orderId}`;
            document.getElementById('paypal-cancel').value = `${window.location.origin}/payment-cancelled?invoice=${orderData.orderId}`;
            
            // Submit the form with PayPal parameters
            document.getElementById('paypal-form').submit();
            
            if (onSuccess) {
                onSuccess(orderData);
            }

        } catch (error) {
            console.error('Checkout error:', error);
            setError(error.message || 'Checkout failed');
            if (onError) onError(error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate total amount
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <div className="paypal-checkout">
            {error && <div className="error-message">{error}</div>}
            <form 
                id="paypal-form"
                action="https://www.sandbox.paypal.com/cgi-bin/webscr" 
                method="post"
                onSubmit={handleCheckout}
            >
                {/* PayPal required fields */}
                <input type="hidden" name="cmd" value="_cart" />
                <input type="hidden" name="upload" value="1" />
                <input type="hidden" name="business" value="sb-t4qwr40698380@business.example.com" />
                <input type="hidden" name="charset" value="utf-8" />
                <input type="hidden" name="currency_code" value="HKD" />
                <input type="hidden" name="lc" value="HK" />
                <input type="hidden" id="paypal-custom" name="custom" value="" />
                <input type="hidden" id="paypal-invoice" name="invoice" value="" />
                <input type="hidden" name="no_shipping" value="1" />
                <input type="hidden" name="rm" value="1" /> {/* Return method: GET */}

                {/* Cart items */}
                {items.map((item, index) => (
                    <React.Fragment key={item.pid}>
                        <input type="hidden" name={`item_name_${index + 1}`} value={item.name} />
                        <input type="hidden" name={`item_number_${index + 1}`} value={item.pid} />
                        <input type="hidden" name={`quantity_${index + 1}`} value={item.quantity} />
                        <input type="hidden" name={`amount_${index + 1}`} value={item.price.toFixed(2)} />
                    </React.Fragment>
                ))}

                {/* Return URLs */}
                <input type="hidden" id="paypal-return" name="return" value={`${window.location.origin}/payment-success?invoice=PENDING`} />
                <input type="hidden" id="paypal-cancel" name="cancel_return" value={`${window.location.origin}/payment-cancelled`} />
                <input type="hidden" name="notify_url" value={`${API_BASE_URL}/paypal/ipn`} />

                <button 
                    type="submit" 
                    className="checkout-button"
                    disabled={loading || items.length === 0 || !csrfToken}
                >
                    {loading ? 'Processing...' : `Pay with PayPal`}
                </button>
            </form>
        </div>
    );
}

export default PayPalCheckout; 