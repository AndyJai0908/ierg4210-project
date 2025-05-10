// finished checking and debugging
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
 
const API_BASE_URL = 'http://localhost:5000/api';

function Login({ onLoginSuccess, setUser }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Get CSRF token
            const csrfResponse = await fetch(`${API_BASE_URL}/csrf-token`, {
                credentials: 'include'
            });
            
            if (!csrfResponse.ok) {
                throw new Error(`Failed to get CSRF token: ${csrfResponse.status}`);
            }
            
            const csrfData = await csrfResponse.json();
            console.log('CSRF token received:', csrfData); // Debug log
            
            if (!csrfData.csrfToken) {
                throw new Error('No CSRF token in response');
            }

            console.log('Attempting login with credentials for:', email);
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfData.csrfToken
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    email: email.trim(), 
                    password 
                })
            });

            console.log('Login response status:', response.status);
            const data = await response.json();
            console.log('Login response data:', data);

            if (response.ok) {
                if (setUser) {
                    setUser(data.user);
                }
                if (onLoginSuccess) {
                    onLoginSuccess(data.user);
                }
                navigate('/');
            } else {
                setError(data.error || 'Failed to login');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(`Authentication error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-form">
                <h2>Login</h2>
                {error && <div className="error-message">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email:</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password:</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login; 