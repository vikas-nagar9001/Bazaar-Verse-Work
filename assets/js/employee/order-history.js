// Order History Page
// API_BASE_URL is defined in auth.js
let allOrders = [];
let filteredOrders = [];

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    const employee = await checkAuth();
    if (!employee) return;

    // Display employee name
    document.getElementById('employee-name').textContent = `Welcome, ${employee.name}`;

    // Load orders
    loadOrders(employee.id);
});

async function loadOrders(employeeId) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/employee/${employeeId}`);
        const data = await response.json();

        if (data.success) {
            allOrders = data.orders;
            filteredOrders = [...allOrders];
            
            displayOrders();
            updateSummary();
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function displayOrders() {
    const tbody = document.getElementById('orders-tbody');
    
    if (filteredOrders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">
                    No orders found
                </td>
            </tr>
        `;
        return;
    }

    // Sort by date and time (newest first)
    const sortedOrders = filteredOrders.sort((a, b) => {
        const dateA = new Date(a.date + ' ' + a.time);
        const dateB = new Date(b.date + ' ' + b.time);
        return dateB - dateA;
    });

    tbody.innerHTML = sortedOrders.map(order => `
        <tr class="text-gray-700 dark:text-gray-400">
            <td class="px-4 py-3 text-sm">${order.orderId}</td>
            <td class="px-4 py-3 text-sm font-semibold">${order.phoneNumber || 'N/A'}</td>
            <td class="px-4 py-3 text-xs">
                <span class="px-2 py-1 font-semibold leading-tight rounded-full ${getStatusColor(order.status)}">
                    ${order.status}
                </span>
            </td>
            <td class="px-4 py-3 text-sm">${order.smsCode || '-'}</td>
            <td class="px-4 py-3 text-sm">${formatDate(order.date)}</td>
            <td class="px-4 py-3 text-sm">${order.time}</td>
        </tr>
    `).join('');
}

function filterOrders() {
    const statusFilter = document.getElementById('status-filter').value;
    const dateFilter = document.getElementById('date-filter').value;

    filteredOrders = allOrders.filter(order => {
        let matches = true;

        if (statusFilter && order.status !== statusFilter) {
            matches = false;
        }

        if (dateFilter && order.date !== dateFilter) {
            matches = false;
        }

        return matches;
    });

    displayOrders();
    updateSummary();
}

function clearFilters() {
    document.getElementById('status-filter').value = '';
    document.getElementById('date-filter').value = '';
    filteredOrders = [...allOrders];
    displayOrders();
    updateSummary();
}

function updateSummary() {
    const total = filteredOrders.length;
    const completed = filteredOrders.filter(o => o.status === 'completed').length;
    const cancelled = filteredOrders.filter(o => o.status === 'cancelled').length;

    document.getElementById('total-count').textContent = total;
    document.getElementById('completed-count').textContent = completed;
    document.getElementById('cancelled-count').textContent = cancelled;
}

function getStatusColor(status) {
    switch(status) {
        case 'completed':
            return 'text-green-700 bg-green-100 dark:bg-green-700 dark:text-green-100';
        case 'pending':
            return 'text-yellow-700 bg-yellow-100 dark:bg-yellow-700 dark:text-yellow-100';
        case 'cancelled':
            return 'text-red-700 bg-red-100 dark:bg-red-700 dark:text-red-100';
        default:
            return 'text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-100';
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
