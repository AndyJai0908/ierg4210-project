const csrf = require('csrf');
const tokens = new csrf();

const csrfMiddleware = (req, res, next) => {
    // Skip for non-modifying methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }
    
    // Generate CSRF token if not exists
    if (!req.session.csrfSecret) {
        console.log('Creating new CSRF secret for session:', req.sessionID);
        req.session.csrfSecret = tokens.secretSync();
    }
    
    // Verify token on POST/PUT/DELETE requests
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        // Check token in header
        const token = req.headers['x-csrf-token'];
        
        if (!token) {
            console.error('Missing CSRF token for request:', {
                path: req.path,
                method: req.method,
                sessionID: req.sessionID
            });
            return res.status(403).json({ error: 'Missing CSRF token' });
        }
        
        if (!tokens.verify(req.session.csrfSecret, token)) {
            console.error('Invalid CSRF token for request:', {
                path: req.path,
                method: req.method,
                token: token.substring(0, 10) + '...',
                sessionID: req.sessionID
            });
            return res.status(403).json({ error: 'Invalid CSRF token' });
        }
        
        console.log('CSRF token verified for request:', {
            path: req.path,
            method: req.method,
            sessionID: req.sessionID
        });
    }
    
    next();
};

module.exports = csrfMiddleware; 