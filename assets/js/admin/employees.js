// Manage Employees
// API_BASE_URL is defined in auth.js
let employees = [];

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAdminAuth();

    // Load employees
    loadEmployees();

    // Handle add employee form
    document.getElementById('add-employee-form').addEventListener('submit', handleAddEmployee);
});

async function loadEmployees() {
    try {
        const response = await fetch(`${API_BASE_URL}/employees`);
        const data = await response.json();
        
        if (!data.success) {
            console.error('Failed to load employees');
            return;
        }
        
        employees = data.employees;
    const tbody = document.getElementById('employees-tbody');

    if (employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">
                    No employees found. Add your first employee!
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = employees.map(emp => `
        <tr class="text-gray-700 dark:text-gray-400">
            <td class="px-4 py-3 text-sm font-semibold">${emp.name}</td>
            <td class="px-4 py-3 text-sm">${emp.username}</td>
            <td class="px-4 py-3 text-sm">${emp.email}</td>
            <td class="px-4 py-3 text-xs">
                <span class="px-2 py-1 font-semibold leading-tight rounded-full ${emp.status === 'active' ? 'text-green-700 bg-green-100 dark:bg-green-700 dark:text-green-100' : 'text-red-700 bg-red-100 dark:bg-red-700 dark:text-red-100'}">
                    ${emp.status}
                </span>
            </td>
            <td class="px-4 py-3 text-sm">${formatDate(emp.createdAt || emp.createdDate)}</td>
            <td class="px-4 py-3 text-sm">
                <div class="flex items-center space-x-2">
                    <button onclick="toggleEmployeeStatus('${emp._id}', '${emp.status}')" class="px-2 py-1 text-xs font-medium leading-5 text-white transition-colors duration-150 ${emp.status === 'active' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} border border-transparent rounded-md focus:outline-none">
                        ${emp.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onclick="deleteEmployee('${emp._id}')" class="px-2 py-1 text-xs font-medium leading-5 text-white transition-colors duration-150 bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

async function handleAddEmployee(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('emp-name').value.trim(),
        username: document.getElementById('emp-username').value.trim(),
        email: document.getElementById('emp-email').value.trim(),
        password: document.getElementById('emp-password').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/employees`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            // Clear form
            document.getElementById('add-employee-form').reset();

            // Reload employees
            loadEmployees();

            // Close modal
            const modalEvent = new Event('click');
            document.querySelector('[\\@click="showAddModal = false"]')?.dispatchEvent(modalEvent);

            showAlert('success', 'Employee added successfully!');
        } else {
            showAlert('error', data.message || 'Failed to add employee');
        }
    } catch (error) {
        showAlert('error', 'Failed to add employee. Please try again.');
        console.error('Error:', error);
    }
}

async function toggleEmployeeStatus(employeeId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    try {
        const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('success', `Employee ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
            loadEmployees();
        } else {
            showAlert('error', data.message || 'Failed to update status');
        }
    } catch (error) {
        showAlert('error', 'Failed to update employee status. Please try again.');
        console.error('Error:', error);
    }
}

async function deleteEmployee(employeeId) {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            loadEmployees();
            showAlert('success', 'Employee and their orders deleted successfully!');
        } else {
            showAlert('error', data.message || 'Failed to delete employee');
        }
    } catch (error) {
        showAlert('error', 'Failed to delete employee. Please try again.');
        console.error('Error:', error);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

function showAlert(type, message) {
    const colors = {
        success: 'green',
        error: 'red',
        warning: 'yellow',
        info: 'blue'
    };
    
    const color = colors[type] || 'blue';
    const alertHtml = `
        <div class="p-4 mb-4 text-sm text-${color}-700 bg-${color}-100 rounded-lg dark:bg-${color}-200 dark:text-${color}-800" role="alert">
            <span class="font-medium">${type.charAt(0).toUpperCase() + type.slice(1)}!</span> ${message}
        </div>
    `;
    
    document.getElementById('alert-container').innerHTML = alertHtml;
    setTimeout(() => {
        document.getElementById('alert-container').innerHTML = '';
    }, 5000);
}
