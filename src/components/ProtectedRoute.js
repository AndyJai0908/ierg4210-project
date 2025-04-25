import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, user, adminRequired = false }) {
    // Not logged in
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Admin route but user is not admin
    if (adminRequired && !user.isAdmin) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedRoute; 