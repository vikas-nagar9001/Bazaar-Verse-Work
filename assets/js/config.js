// API Configuration
const API_CONFIG = {
    // Change this to your server URL
    BASE_URL: 'http://localhost:3000/api',
    
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
