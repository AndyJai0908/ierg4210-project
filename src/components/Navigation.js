import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navigation.css'; 

const Navigation = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user is logged in 
        const checkLoginStatus = async () => {
            try {
                const response = await fetch('https://s21.ierg4210.ie.cuhk.edu.hk/api/auth/status', {
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
            const response = await fetch('https://s21.ierg4210.ie.cuhk.edu.hk/api/auth/logout', {
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
                        <Link to="/member-portal" className="nav-link">My Account</Link>
                        <Link to="/change-password" className="nav-link">Change Password</Link>
                        <button onClick={handleLogout} className="logout-button">Logout</button>
                    </div>
                ) : (
                    <div className="auth-menu">
                        <Link to="/member-portal" className="nav-link">Member Portal</Link>
                        <Link to="/login" className="login-button">Login</Link>
                        <Link to="/register" className="register-button">Register</Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navigation;