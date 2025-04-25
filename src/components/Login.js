import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const API_BASE_URL = 'https://s21.ierg4210.ie.cuhk.edu.hk/api';

function Login({ onLoginSuccess }) {
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
            // First get CSRF token
            console.log('Fetching CSRF token...'); // Debug log
            const csrfResponse = await fetch(`${API_BASE_URL}/csrf-token`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!csrfResponse.ok) {
                const errorData = await csrfResponse.json();
                throw new Error(`Failed to get CSRF token: ${errorData.error || csrfResponse.statusText}`);
            }
            
            const csrfData = await csrfResponse.json();
            console.log('Received CSRF token response:', csrfData); // Debug log
            
            if (!csrfData.csrfToken) {
                throw new Error('No CSRF token in response');
            }

            // Then attempt login
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

            const data = await response.json();

            if (response.ok) {
                if (onLoginSuccess) {
                    onLoginSuccess(data.user);
                }
                navigate('/');
            } else {
                console.error('Login response:', data);
                setError(data.message || 'Login failed. Please check your credentials.');
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
    );
}

export default Login; 