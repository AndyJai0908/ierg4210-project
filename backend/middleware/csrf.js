const Tokens = require('csrf');
const tokens = new Tokens();

const csrf = (req, res, next) => {
    // Generate CSRF token if not exists
    if (!req.session.csrfSecret) {
        req.session.csrfSecret = tokens.secretSync();
    }
    
    // Generate nonce for this request
    const nonce = tokens.create(req.session.csrfSecret);
    
    // Add nonce to res.locals for templates
    res.locals.csrfNonce = nonce;
    
    // Verify token on POST/PUT/DELETE requests
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        // Check both header and form field
        const token = req.headers['x-csrf-token'] || req.body._csrf;
        
        if (!token || !tokens.verify(req.session.csrfSecret, token)) {
            return res.status(403).json({ error: 'Invalid CSRF token' });
        }
    }
    
    next();
};

module.exports = csrf; 