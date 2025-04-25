import React, { useState, useEffect } from 'react';
import { Container, Table, Alert, Spinner } from 'react-bootstrap';

const MemberPortal = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                // First get CSRF token
                const csrfResponse = await fetch('https://s21.ierg4210.ie.cuhk.edu.hk/api/csrf-token', {
                    credentials: 'include'
                });
                const { csrfToken } = await csrfResponse.json();

                // Then fetch orders with credentials and CSRF token
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
            } catch (error) {
                console.error('Error fetching orders:', error);
                setError('Failed to load orders. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

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
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="mt-4">
                <Alert variant="danger">{error}</Alert>
            </Container>
        );
    }

    if (orders.length === 0) {
        return (
            <Container className="mt-4">
                <Alert variant="info">No orders found.</Alert>
            </Container>
        );
    }

    return (
        <Container className="mt-4">
            <h2 className="mb-4">Recent Orders</h2>
            <Table striped bordered hover responsive>
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
                                {order.products.map((product, index) => (
                                    <div key={index}>
                                        {product} x {order.quantities[index]} @ {formatCurrency(order.prices[index])}
                                    </div>
                                ))}
                            </td>
                            <td>{formatCurrency(order.totalAmount)}</td>
                            <td>
                                <span className={`badge bg-${order.status === 'completed' ? 'success' : 
                                    order.status === 'processing' ? 'warning' : 
                                    order.status === 'cancelled' ? 'danger' : 'secondary'}`}>
                                    {order.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Container>
    );
};

export default MemberPortal; 