// Admin Dashboard
// API_BASE_URL is defined in auth.js

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAdminAuth();

    // Load all statistics
    loadStatistics();
});

async function loadStatistics() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/stats`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        const data = await response.json();
        
        if (!data.success) {
            console.error('Failed to load statistics');
            return;
        }
        
        const stats = data.stats;
        const orders = stats.allOrders || [];
        const employees = stats.employees || [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Today's statistics
    const todayOrders = orders.filter(order => {
        const orderDate = new Date(order.date);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
    });

    const todayCompleted = todayOrders.filter(o => o.status === 'completed').length;
    const todayPending = todayOrders.filter(o => o.status === 'pending').length;
    const todayCancelled = todayOrders.filter(o => o.status === 'cancelled').length;

    document.getElementById('today-orders').textContent = todayOrders.length;
    document.getElementById('today-completed').textContent = todayCompleted;
    document.getElementById('today-pending').textContent = todayPending;
    document.getElementById('today-cancelled').textContent = todayCancelled;

    // Monthly statistics
    const monthlyOrders = orders.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });

    const monthCompleted = monthlyOrders.filter(o => o.status === 'completed').length;
    const monthPending = monthlyOrders.filter(o => o.status === 'pending').length;
    const monthCancelled = monthlyOrders.filter(o => o.status === 'cancelled').length;

    document.getElementById('month-orders').textContent = monthlyOrders.length;
    document.getElementById('month-completed').textContent = monthCompleted;
    document.getElementById('month-pending').textContent = monthPending;
    document.getElementById('month-cancelled').textContent = monthCancelled;

    // All time statistics
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const successRate = orders.length > 0 ? Math.round((completedOrders / orders.length) * 100) : 0;
    const activeEmployees = employees.filter(e => e.status === 'active').length;

    document.getElementById('all-orders').textContent = orders.length;
    document.getElementById('all-employees').textContent = employees.length;
    document.getElementById('success-rate').textContent = successRate + '%';
    document.getElementById('active-employees').textContent = activeEmployees;

    // Top performers and recent activity
    displayTopPerformers(stats.topPerformers || []);
    displayRecentActivity(stats.recentOrders || orders.slice(0, 5));
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function displayTopPerformers(topPerformers) {
    const container = document.getElementById('top-performers');
    if (!container) return;

    if (topPerformers.length === 0) {
        container.innerHTML = '<tr><td colspan="4" class="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">No data available</td></tr>';
        return;
    }

    container.innerHTML = topPerformers.map(performer => `
        <tr class="text-gray-700 dark:text-gray-400">
            <td class="px-4 py-3 text-sm font-semibold">${performer.name}</td>
            <td class="px-4 py-3 text-sm">${performer.totalOrders}</td>
            <td class="px-4 py-3 text-sm text-green-600 dark:text-green-400">${performer.completedOrders}</td>
            <td class="px-4 py-3 text-sm">
                <span class="px-2 py-1 font-semibold leading-tight rounded-full ${getSuccessColor(performer.successRate || 0)}">
                    ${performer.successRate || 0}%
                </span>
            </td>
        </tr>
    `).join('');
}

function displayRecentActivity(recentOrders) {
    const container = document.getElementById('recent-activity');
    if (!container) return;

    if (recentOrders.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">No recent activity</td></tr>';
        return;
    }

    container.innerHTML = recentOrders.map(order => `
        <tr class="text-gray-700 dark:text-gray-400">
            <td class="px-4 py-3 text-sm">${order.orderId || 'N/A'}</td>
            <td class="px-4 py-3 text-sm">${order.employeeName || 'Unknown'}</td>
            <td class="px-4 py-3 text-sm">${order.phoneNumber || 'N/A'}</td>
            <td class="px-4 py-3 text-xs">
                <span class="px-2 py-1 font-semibold leading-tight rounded-full ${getStatusColor(order.status)}">
                    ${order.status}
                </span>
            </td>
            <td class="px-4 py-3 text-sm">${formatDate(order.date)}</td>
        </tr>
    `).join('');
}

function loadTopPerformers(todayOrders, employees) {
    const performanceMap = new Map();

    // Calculate performance for each employee
    employees.forEach(emp => {
        const empOrders = todayOrders.filter(o => o.employeeId === emp.id);
        const empCompleted = empOrders.filter(o => o.status === 'completed').length;
        const empSuccessRate = empOrders.length > 0 
            ? Math.round((empCompleted / empOrders.length) * 100) 
            : 0;

        if (empOrders.length > 0) {
            performanceMap.set(emp.id, {
                name: emp.name,
                ordersCount: empOrders.length,
                completed: empCompleted,
                successRate: empSuccessRate
            });
        }
    });

    // Sort by orders count
    const sortedPerformers = Array.from(performanceMap.values())
        .sort((a, b) => b.ordersCount - a.ordersCount)
        .slice(0, 5);

    const tbody = document.getElementById('top-performers');

    if (sortedPerformers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">
                    No orders today
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = sortedPerformers.map(perf => `
        <tr class="text-gray-700 dark:text-gray-400">
            <td class="px-4 py-3 text-sm font-semibold">${perf.name}</td>
            <td class="px-4 py-3 text-sm">${perf.ordersCount}</td>
            <td class="px-4 py-3 text-sm">${perf.completed}</td>
            <td class="px-4 py-3 text-sm">
                <span class="px-2 py-1 font-semibold leading-tight rounded-full ${getSuccessColor(perf.successRate)}">
                    ${perf.successRate}%
                </span>
            </td>
        </tr>
    `).join('');
}

function getSuccessColor(rate) {
    if (rate >= 80) return 'text-green-700 bg-green-100 dark:bg-green-700 dark:text-green-100';
    if (rate >= 50) return 'text-yellow-700 bg-yellow-100 dark:bg-yellow-700 dark:text-yellow-100';
    return 'text-red-700 bg-red-100 dark:bg-red-700 dark:text-red-100';
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
    if (!dateString || dateString === 'Never') return dateString || 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}
