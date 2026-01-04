// Admin Authentication
const API_BASE_URL = API_CONFIG.BASE_URL;

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('admin-login-form');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');

    // Check if already logged in
    const currentAdmin = localStorage.getItem('currentAdmin');
    if (currentAdmin && window.location.pathname.includes('login.html')) {
        window.location.href = '/admin/index.html';
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            try {
                const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (data.success) {
                    // Store admin session
                    localStorage.setItem('currentAdmin', JSON.stringify({
                        username: data.admin.username,
                        role: 'admin'
                    }));
                    
                    // Redirect to admin dashboard
                    window.location.href = '/admin/index.html';
                } else {
                    showError(data.message || 'Invalid admin credentials.');
                }
            } catch (error) {
                console.error('Login error:', error);
                showError('Failed to connect to server. Please try again.');
            }
        });
    }

    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        setTimeout(() => {
            errorMessage.classList.add('hidden');
        }, 5000);
    }
});

// Check admin authentication on protected pages
function checkAdminAuth() {
    const currentAdmin = localStorage.getItem('currentAdmin');
    if (!currentAdmin && !window.location.pathname.includes('login.html')) {
        window.location.href = '/admin/login.html';
    }
    return currentAdmin ? JSON.parse(currentAdmin) : null;
}

// Admin logout function
function adminLogout() {
    localStorage.removeItem('currentAdmin');
    window.location.href = '/admin/login.html';
}
