// Employee Statistics
// API_BASE_URL is defined in auth.js
let currentPeriod = 'today';

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAdminAuth();

    // Load statistics
    filterStats();
});

function filterStats() {
    currentPeriod = document.getElementById('period-filter').value;
    loadEmployeeStats();
}

async function loadEmployeeStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/employee-stats?period=${currentPeriod}`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });
        const data = await response.json();
        
        if (!data.success) {
            console.error('Failed to load employee stats');
            return;
        }
        
        let employeeStats = data.employeeStats;
        
        displayStats(employeeStats);
        updateSummary(employeeStats);
    } catch (error) {
        console.error('Error loading employee stats:', error);
    }
}

function displayStats(stats) {
    const tbody = document.getElementById('stats-tbody');

    if (stats.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">
                    No employees found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = stats.map(stat => `
        <tr class="text-gray-700 dark:text-gray-400">
            <td class="px-4 py-3 text-sm font-semibold">${stat.name}</td>
            <td class="px-4 py-3 text-sm">${stat.totalOrders}</td>
            <td class="px-4 py-3 text-sm text-green-600 dark:text-green-400">${stat.completed}</td>
            <td class="px-4 py-3 text-sm text-blue-600 dark:text-blue-400">${stat.pending}</td>
            <td class="px-4 py-3 text-sm text-red-600 dark:text-red-400">${stat.cancelled}</td>
            <td class="px-4 py-3 text-xs">
                <span class="px-2 py-1 font-semibold leading-tight rounded-full ${getSuccessColor(stat.successRate)}">
                    ${stat.successRate}%
                </span>
            </td>
            <td class="px-4 py-3 text-sm">${formatDate(stat.lastActivity)}</td>
        </tr>
    `).join('');
}

function updateSummary(stats) {
    const totalOrders = stats.reduce((sum, s) => sum + s.totalOrders, 0);
    const totalCompleted = stats.reduce((sum, s) => sum + s.completed, 0);
    const totalPending = stats.reduce((sum, s) => sum + s.pending, 0);
    const avgSuccess = stats.length > 0
        ? Math.round(stats.reduce((sum, s) => sum + s.successRate, 0) / stats.length)
        : 0;

    document.getElementById('summary-total').textContent = totalOrders;
    document.getElementById('summary-completed').textContent = totalCompleted;
    document.getElementById('summary-pending').textContent = totalPending;
    document.getElementById('summary-success').textContent = avgSuccess + '%';
}

function filterOrdersByPeriod(orders, period) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    switch (period) {
        case 'today':
            return orders.filter(order => {
                const orderDate = new Date(order.date);
                orderDate.setHours(0, 0, 0, 0);
                return orderDate.getTime() === today.getTime();
            });

        case 'month':
            return orders.filter(order => {
                const orderDate = new Date(order.date);
                return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
            });

        case 'all':
        default:
            return orders;
    }
}

function getSuccessColor(rate) {
    if (rate >= 80) return 'text-green-700 bg-green-100 dark:bg-green-700 dark:text-green-100';
    if (rate >= 50) return 'text-yellow-700 bg-yellow-100 dark:bg-yellow-700 dark:text-yellow-100';
    return 'text-red-700 bg-red-100 dark:bg-red-700 dark:text-red-100';
}

function formatDate(dateString) {
    if (dateString === 'Never') return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}
