// Employee Authentication
// const API_BASE_URL = 'http://localhost:3000/api';
const API_BASE_URL = 'https://bazaar-verse-work.onrender.com/api';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');

    // Check if already logged in
    const currentEmployee = localStorage.getItem('currentEmployee');
    if (currentEmployee && window.location.pathname.includes('login.html')) {
        window.location.href = 'index.html';
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            try {
                const response = await fetch(`${API_BASE_URL}/auth/employee/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (data.success) {
                    // Store current employee session
                    localStorage.setItem('currentEmployee', JSON.stringify(data.employee));
                    
                    // Redirect to dashboard
                    window.location.href = 'index.html';
                } else {
                    showError(data.message || 'Invalid username or password, or account is inactive.');
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

// Check authentication on protected pages
async function checkAuth() {
    const currentEmployee = localStorage.getItem('currentEmployee');
    if (!currentEmployee && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
        return null;
    }
    
    if (currentEmployee && !window.location.pathname.includes('login.html')) {
        const employee = JSON.parse(currentEmployee);
        
        // Validate employee still exists and is active on server
        try {
            const response = await fetch(`${API_BASE_URL}/employees`);
            const data = await response.json();
            
            if (data.success) {
                const serverEmployee = data.employees.find(emp => emp._id === employee.id);
                
                // If employee not found or inactive, logout
                if (!serverEmployee || serverEmployee.status !== 'active') {
                    console.log('Employee no longer active or deleted');
                    logout();
                    return null;
                }
            }
        } catch (error) {
            console.error('Error validating employee:', error);
        }
    }
    
    return currentEmployee ? JSON.parse(currentEmployee) : null;
}

// Logout function
function logout() {
    localStorage.removeItem('currentEmployee');
    window.location.href = 'login.html';
}
