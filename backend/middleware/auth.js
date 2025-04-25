const authMiddleware = {
    // Check if user is logged in
    isAuthenticated: (req, res, next) => {
        if (!req.session || !req.session.userId) {
            console.log('Authentication failed: No session or userId');
            return res.status(401).json({ error: 'Authentication required' });
        }
        next();
    },

    // Check if user is admin
    isAdmin: (req, res, next) => {
        console.log('Checking admin status:', {
            sessionExists: !!req.session,
            userId: req.session?.userId,
            isAdmin: req.session?.isAdmin
        });

        if (!req.session || !req.session.userId) {
            console.log('Admin check failed: No session or userId');
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!req.session.isAdmin) {
            console.log('Admin check failed: User is not admin');
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    }
};

module.exports = authMiddleware; 