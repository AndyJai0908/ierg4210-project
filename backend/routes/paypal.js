const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { createOrder, getProduct, updateOrderStatus, getOrder } = require('../database/db');
const paypal = require('../config/paypal');

// Create PayPal order
router.post('/create-order', async (req, res) => {
    try {
        const { items } = req.body;
        
        // log for debugging
        console.log('Received items for PayPal order:', items);

        // Validate items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Invalid items data' });
        }

        // Validate quantities and fetch prices
        const validatedItems = await Promise.all(items.map(async (item) => {
            if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
                throw new Error(`Invalid quantity for product ${item.item_number}`);
            }

            const product = await getProduct(item.item_number);
            if (!product) {
                throw new Error(`Product ${item.item_number} not found`);
            }

            return {
                pid: product.pid,
                quantity: item.quantity,
                price: product.price,
                name: product.name
            };
        }));

        // Calculate total
        const totalAmount = validatedItems.reduce((sum, item) => 
            sum + (item.price * item.quantity), 0
        );

        // Generate random salt
        const salt = crypto.randomBytes(16).toString('hex');

        // Create digest string
        const digestString = [
            paypal.CURRENCY,
            paypal.PAYPAL_MERCHANT_EMAIL,
            salt,
            ...validatedItems.map(item => `${item.pid}:${item.quantity}:${item.price}`),
            totalAmount.toFixed(2)
        ].join('|');

        // Generate digest
        const digest = crypto.createHash('sha256')
            .update(digestString)
            .digest('hex');

        // Create order in database
        const orderId = await createOrder({
            userId: req.session?.userId,
            username: req.session?.email || 'guest',
            currency: paypal.CURRENCY,
            merchantEmail: paypal.PAYPAL_MERCHANT_EMAIL,
            totalAmount,
            digest,
            salt
        }, validatedItems);

        res.json({
            success: true,
            orderId,
            digest,
            items: validatedItems,
            total: totalAmount
        });
    } catch (error) {
        console.error('Error creating PayPal order:', error);
        res.status(500).json({ error: error.message });
    }
});

// Handle PayPal IPN (Instant Payment Notification)
router.post('/ipn', async (req, res) => {
    // Log the IPN data for debugging
    console.log('Received PayPal IPN:', {
        body: req.body,
        headers: req.headers,
        query: req.query
    });

    try {
        const {
            txn_id,          // PayPal transaction ID
            payment_status, 
            invoice,        // Order ID
            custom,         // Digest
            mc_gross,       // Total payment amount
            payment_date,   
            payer_email,    
            receiver_email  
        } = req.body;

        console.log('Processing IPN with data:', {
            txn_id,
            payment_status,
            invoice,
            mc_gross,
            payment_date
        });

        // Verify the payment with PayPal
        if (receiver_email !== paypal.PAYPAL_MERCHANT_EMAIL) {
            console.error('Invalid receiver email:', receiver_email);
            return res.status(400).send('Invalid receiver');
        }

        // Map PayPal payment status to our status
        let orderStatus;
        switch (payment_status?.toLowerCase()) {
            case 'completed':
                orderStatus = 'completed';
                break;
            case 'pending':
                orderStatus = 'processing';
                break;
            case 'failed':
            case 'denied':
            case 'expired':
                orderStatus = 'failed';
                break;
            case 'refunded':
                orderStatus = 'refunded';
                break;
            default:
                orderStatus = 'pending';
        }

        console.log('Updating order status:', {
            invoice,
            oldStatus: payment_status,
            newStatus: orderStatus
        });

        // Update order status in database
        await updateOrderStatus(invoice, orderStatus, txn_id);
        console.log(`Successfully updated order ${invoice} status to ${orderStatus}`);

        res.status(200).send('OK');
    } catch (error) {
        console.error('Error processing PayPal IPN:', error);
        res.status(500).send('Error');
    }
});

// Success route 
router.get('/success', async (req, res) => {
    console.log('Payment successful (GET):', req.query);
    
    try {
        const { invoice } = req.query;
        if (invoice) {
            // Update order status to processing until IPN confirms it
            await updateOrderStatus(invoice, 'processing');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
    }
    
    res.redirect('http://localhost:3000/payment-success');
});

// Cancel route
router.get('/cancel', async (req, res) => {
    console.log('Payment cancelled (GET):', req.query);
    
    try {
        const { invoice } = req.query;
        if (invoice) {
            // Update order status to cancelled
            await updateOrderStatus(invoice, 'cancelled');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
    }
    
    res.redirect('http://localhost:3000/payment-cancelled');
});

module.exports = router; 