import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChangePassword.css';

const API_BASE_URL = 'https://s21.ierg4210.ie.cuhk.edu.hk/api';

const ChangePassword = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        try {
            // Get CSRF token first
            const csrfResponse = await fetch(`${API_BASE_URL}/csrf-token`, {
                credentials: 'include'
            });
            const { csrfToken } = await csrfResponse.json();

            // Submit password change request
            const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to change password');
            }

            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setError(err.message || 'An error occurred while changing password');
        }
    };

    return (
        <div className="change-password-container">
            <form onSubmit={handleSubmit} className="change-password-form">
                <h2>Change Password</h2>
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">Password changed successfully! Redirecting to login...</div>}
                <div className="form-group">
                    <label htmlFor="currentPassword">Current Password:</label>
                    <input
                        type="password"
                        id="currentPassword"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="newPassword">New Password:</label>
                    <input
                        type="password"
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm New Password:</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="submit-button">Change Password</button>
            </form>
        </div>
    );
};

export default ChangePassword;