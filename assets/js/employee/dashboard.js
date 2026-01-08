// Employee Dashboard
// API_BASE_URL is defined in auth.js

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    const employee = await checkAuth();
    if (!employee) return;

    // Display employee name
    document.getElementById('employee-name').textContent = `Welcome, ${employee.name}`;

    // Load and display statistics
    loadStatistics(employee.id);
    loadRecentOrders(employee.id);
});

async function loadStatistics(employeeId) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/employee/${employeeId}`);
        const data = await response.json();

        if (!data.success) {
            console.error('Failed to load statistics');
            return;
        }

        const orders = data.orders;

        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Get current month
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Calculate statistics
        const todayOrders = orders.filter(order => order.date === todayStr);
        
        const monthlyOrders = orders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        });

        const completedOrders = orders.filter(order => order.status === 'completed');
        const successRate = orders.length > 0 
            ? Math.round((completedOrders.length / orders.length) * 100) 
            : 0;

        // Update UI
        document.getElementById('today-orders').textContent = todayOrders.length;
        document.getElementById('monthly-orders').textContent = monthlyOrders.length;
        document.getElementById('success-rate').textContent = successRate + '%';
        document.getElementById('total-orders').textContent = orders.length;
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

async function loadRecentOrders(employeeId) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/employee/${employeeId}`);
        const data = await response.json();

        if (!data.success) {
            console.error('Failed to load orders');
            return;
        }

        const recentOrders = data.orders.slice(0, 5);
        const tbody = document.getElementById('recent-orders');
        
        if (recentOrders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">
                        No recent orders
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = recentOrders.map(order => `
            <tr class="text-gray-700 dark:text-gray-400">
                <td class="px-4 py-3 text-sm">${order.orderId}</td>
                <td class="px-4 py-3 text-sm">${order.phoneNumber || 'N/A'}</td>
                <td class="px-4 py-3 text-xs">
                    <span class="px-2 py-1 font-semibold leading-tight rounded-full ${getStatusColor(order.status)}">
                        ${order.status}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm">${order.smsCode || 'Pending'}</td>
                <td class="px-4 py-3 text-sm">${formatDate(order.date)}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading recent orders:', error);
    }
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
