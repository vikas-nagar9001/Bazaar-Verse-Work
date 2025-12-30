// Shared Utility Functions for Employee and Admin Panels
// Use this file in both employee and admin HTML pages

// Show alert message
function showAlert(type, message) {
    const colors = {
        success: 'green',
        error: 'red',
        warning: 'yellow',
        info: 'blue'
    };
    
    const color = colors[type] || 'blue';
    const alertHtml = `
        <div class="p-4 mb-4 text-sm text-${color}-700 bg-${color}-100 rounded-lg dark:bg-${color}-200 dark:text-${color}-800 animate-fade-in" role="alert">
            <span class="font-medium">${type.charAt(0).toUpperCase() + type.slice(1)}!</span> ${message}
        </div>
    `;
    
    // Try to find alert container
    const container = document.getElementById('alert-container') || document.body.firstChild;
    if (container.id === 'alert-container') {
        container.innerHTML = alertHtml;
    } else {
        // Create container if doesn't exist
        const div = document.createElement('div');
        div.id = 'temp-alert';
        div.innerHTML = alertHtml;
        div.style.position = 'fixed';
        div.style.top = '20px';
        div.style.right = '20px';
        div.style.zIndex = '9999';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 5000);
        return;
    }
    
    setTimeout(() => {
        if (container.id === 'alert-container') {
            container.innerHTML = '';
        }
    }, 5000);
}

// Format date to readable format
function formatDate(dateString) {
    if (!dateString || dateString === 'Never') return dateString || 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

// Get status color based on order status
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

// Get success rate color
function getSuccessColor(rate) {
    if (rate >= 80) return 'text-green-700 bg-green-100 dark:bg-green-700 dark:text-green-100';
    if (rate >= 50) return 'text-yellow-700 bg-yellow-100 dark:bg-yellow-700 dark:text-yellow-100';
    return 'text-red-700 bg-red-100 dark:bg-red-700 dark:text-red-100';
}

// Debounce function for search/filter inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Check if user is online
function checkConnection() {
    if (!navigator.onLine) {
        showAlert('error', 'No internet connection. Please check your network.');
        return false;
    }
    return true;
}

// Handle API errors consistently
async function handleAPIResponse(response) {
    if (!response.ok) {
        const data = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// Copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showAlert('success', 'Copied to clipboard!');
    }).catch(() => {
        showAlert('error', 'Failed to copy');
    });
}

// Confirm dialog with custom message
function confirmAction(message) {
    return confirm(message);
}

// Loading state management
function setLoading(elementId, isLoading, loadingText = 'Loading...') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (isLoading) {
        element.disabled = true;
        element.dataset.originalText = element.textContent;
        element.textContent = loadingText;
    } else {
        element.disabled = false;
        element.textContent = element.dataset.originalText || element.textContent;
    }
}

// Export CSV from table data
function exportToCSV(data, filename) {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

function convertToCSV(objArray) {
    const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
    let str = '';
    
    // Headers
    const headers = Object.keys(array[0]);
    str += headers.join(',') + '\r\n';
    
    // Data
    for (let i = 0; i < array.length; i++) {
        let line = '';
        for (let j = 0; j < headers.length; j++) {
            if (line !== '') line += ',';
            line += array[i][headers[j]];
        }
        str += line + '\r\n';
    }
    return str;
}

console.log('✅ Utilities loaded successfully');
