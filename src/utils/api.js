const fetchWithCSRF = async (url, options = {}) => {
    // Get CSRF token from meta tag
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    
    // Add CSRF token to headers
    const headers = {
        ...options.headers,
        'X-CSRF-Token': csrfToken
    };

    // Add credentials for cookies
    const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
};

export { fetchWithCSRF }; 