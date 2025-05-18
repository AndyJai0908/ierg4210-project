import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Register.css';

const API_BASE_URL = 'https://s21.ierg4210.ie.cuhk.edu.hk/api';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Validate passwords match
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        try {
            // Get CSRF token
            const csrfResponse = await fetch(`${API_BASE_URL}/csrf-token`, {
                credentials: 'include'
            });
            
            if (!csrfResponse.ok) {
                throw new Error(`Failed to get CSRF token`);
            }
            
            const { csrfToken } = await csrfResponse.json();

            console.log('Got CSRF token:', csrfToken); // Debug log

            // Register user
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    email: email.trim(), 
                    password 
                })
            });

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                
                if (response.ok) {
                    setSuccess(true);
                    setTimeout(() => {
                        navigate('/login');
                    }, 2000);
                } else {
                    setError(data.error || 'Registration failed');
                }
            } else {
                // Handle non-JSON response
                const text = await response.text();
                console.error('Received non-JSON response:', text);
                setError(`Server error: Unexpected response format`);
            }
        } catch (err) {
            console.error('Registration error:', err);
            setError(`Registration error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="register-container">
            <div className="register-form">
                <h2>Register</h2>
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">Registration successful, please login.</div>}
                
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
                            minLength="8"
                        />
                        <small className="form-hint">Password must be at least 8 characters long</small>
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password:</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? 'Registering...' : 'Register'}
                    </button>
                    
                    <div className="form-footer">
                        Already have an account? <a href="/login" onClick={(e) => {
                            e.preventDefault();
                            navigate('/login');
                        }}>Login</a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;
