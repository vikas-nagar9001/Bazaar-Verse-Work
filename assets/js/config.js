// API Configuration
const API_CONFIG = {
    // Change this to your server URL
    // BASE_URL: 'http://localhost:3000/api',
    // BASE_URL: 'https://locally-secure-chamois.ngrok-free.app/api',
    BASE_URL: 'https://n2hz3nb5-3000.inc1.devtunnels.ms/api',

    // API Endpoints
    endpoints: {
        // Auth
        employeeLogin: '/auth/employee/login',
        adminLogin: '/auth/admin/login',

        // Employees
        employees: '/employees',

        // Orders
        orders: '/orders',
        requestNumber: '/orders/request',
        checkSMS: '/orders/check-sms',
        cancelOrder: '/orders/cancel',
        activeOrder: '/orders/active',

        // Admin
        stats: '/admin/stats',
        employeeStats: '/admin/employee-stats',
        topPerformers: '/admin/top-performers'
    }
};

// Helper function to build full URL
function getApiUrl(endpoint) {
    return API_CONFIG.BASE_URL + API_CONFIG.endpoints[endpoint];
}

// Helper function for fetch with ngrok header
function apiFetch(url, options = {}) {
    const headers = {
        'ngrok-skip-browser-warning': 'true',
        ...options.headers
    };
    return fetch(url, { ...options, headers });
}
