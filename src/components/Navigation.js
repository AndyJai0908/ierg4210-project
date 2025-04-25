import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navigation.css';  // We'll create this file next

const Navigation = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user is logged in when component mounts
        const checkLoginStatus = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/auth/status', {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                }
            } catch (error) {
                console.error('Error checking login status:', error);
            }
        };
        checkLoginStatus();
    }, []);

    const handleLogout = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                setUser(null);
                navigate('/');
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <nav className="navigation">
            <div className="nav-left">
                <Link to="/" className="nav-brand">Shop</Link>
            </div>
            <div className="nav-right">
                {user ? (
                    <div className="user-menu">
                        <span className="welcome-text">Welcome, {user.email}</span>
                        <Link to="/change-password" className="nav-link">Change Password</Link>
                        <button onClick={handleLogout} className="logout-button">Logout</button>
                    </div>
                ) : (
                    <Link to="/login" className="login-button">Login</Link>
                )}
            </div>
        </nav>
    );
};

export default Navigation;