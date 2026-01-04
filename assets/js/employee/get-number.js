// Get Number Page - Advanced Professional Version
// API_BASE_URL is defined in auth.js
let activeOrders = [];
let smsCheckInterval = null;
let timerIntervals = {};
let toastQueue = [];
let isShowingToast = false;
let autoBuyEnabled = false;
let autoBuyInterval = null;
let autoBuyAttempts = 0;
const MAX_AUTO_BUY_ATTEMPTS = 15;

// Helper function to format phone number with country code
function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber.length < 3) return phoneNumber;
    // Add + prefix and space after first 2 digits (country code)
    return `+${phoneNumber.slice(0, 2)} ${phoneNumber.slice(2)}`;
}

document.addEventListener('DOMContentLoaded', async function () {
    const employee = await checkAuth();
    if (!employee) return;

    document.getElementById('employee-name').textContent = `Welcome, ${employee.name}`;
    await checkActiveOrders();
    
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            getNumber();
        }
    });
});

async function checkActiveOrders() {
    const employee = JSON.parse(localStorage.getItem('currentEmployee'));
    try {
        const response = await fetch(`${API_BASE_URL}/orders/active/${employee.id}`);
        const data = await response.json();
        if (data.success && data.activeOrders && data.activeOrders.length > 0) {
            activeOrders = data.activeOrders;
            displayActiveNumbers();
            startSMSCheck();
        } else {
            activeOrders = [];
            displayActiveNumbers();
        }
    } catch (error) {
        console.error('Error checking active orders:', error);
        showToast('error', 'Failed to load active orders. Please refresh the page.');
    }
}

async function getNumber() {
    const employee = JSON.parse(localStorage.getItem('currentEmployee'));
    const btn = document.getElementById('get-number-btn');
    setButtonLoading(btn, true, 'Requesting Number...');

    try {
        const response = await fetch(`${API_BASE_URL}/orders/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: employee.id, employeeName: employee.name })
        });
        const data = await response.json();

        if (data.success) {
            activeOrders.unshift(data.order);
            displayActiveNumbers();
            if (!smsCheckInterval) startSMSCheck();
            showToast('success', `✓ Number received: ${formatPhoneNumber(data.order.phoneNumber)}`);
            playSuccessSound();
            
            // Stop auto-buy on success
            if (autoBuyEnabled) {
                toggleAutoBuy();
                showToast('info', '✓ Auto-buy stopped - Number assigned!');
            }
        } else {
            // Only show error toast if NOT in auto-buy mode (to avoid spam)
            if (!autoBuyEnabled) {
                showToast('error', data.message || 'Failed to get number');
            }
        }
    } catch (error) {
        // Only show error toast if NOT in auto-buy mode (to avoid spam)
        if (!autoBuyEnabled) {
            showToast('error', 'Connection failed. Please check your internet connection.');
        }
        console.error('Error:', error);
    } finally {
        setButtonLoading(btn, false, '🚀 Get Number Now');
    }
}

function toggleAutoBuy() {
    autoBuyEnabled = !autoBuyEnabled;
    const toggle = document.getElementById('auto-buy-toggle');
    const statusText = document.getElementById('auto-buy-status');
    const attemptsText = document.getElementById('auto-buy-attempts');
    const slider = document.getElementById('auto-buy-slider');
    const toggleBg = document.getElementById('toggle-background');

    if (autoBuyEnabled) {
        // Start auto-buy
        autoBuyAttempts = 0;
        toggle.checked = true;
        statusText.textContent = 'ON';
        statusText.classList.remove('text-gray-600', 'dark:text-gray-400');
        statusText.classList.add('text-green-600', 'dark:text-green-400', 'font-bold');
        attemptsText.textContent = `0/${MAX_AUTO_BUY_ATTEMPTS}`;
        attemptsText.classList.remove('hidden');
        
        // Change toggle background to orange gradient
        toggleBg.style.background = 'linear-gradient(to right, #f97316, #ea580c)';
        
        // Move slider to right
        slider.style.transform = window.innerWidth >= 640 ? 'translateX(1.75rem)' : 'translateX(1.25rem)';
        
        // Start the auto-buy process immediately
        performAutoBuy();
        
        // Set up interval to retry every 3 seconds
        autoBuyInterval = setInterval(() => {
            if (autoBuyEnabled) {
                performAutoBuy();
            }
        }, 3000);
    } else {
        // Stop auto-buy
        toggle.checked = false;
        statusText.textContent = 'OFF';
        statusText.classList.remove('text-green-600', 'dark:text-green-400', 'font-bold');
        statusText.classList.add('text-gray-600', 'dark:text-gray-400');
        attemptsText.classList.add('hidden');
        
        // Change toggle background back to gray
        toggleBg.style.background = '#9ca3af';
        
        // Reset slider position
        slider.style.transform = 'translateX(0)';
        
        if (autoBuyInterval) {
            clearInterval(autoBuyInterval);
            autoBuyInterval = null;
        }
    }
}

async function performAutoBuy() {
    if (!autoBuyEnabled) return;
    
    const employee = JSON.parse(localStorage.getItem('currentEmployee'));
    const attemptsText = document.getElementById('auto-buy-attempts');
    
    autoBuyAttempts++;
    attemptsText.textContent = `${autoBuyAttempts}/${MAX_AUTO_BUY_ATTEMPTS}`;
    
    if (autoBuyAttempts >= MAX_AUTO_BUY_ATTEMPTS) {
        toggleAutoBuy();
        showToast('warning', `⚠️ Auto-buy stopped - Reached ${MAX_AUTO_BUY_ATTEMPTS} attempts limit`);
        return;
    }
    
    const btn = document.getElementById('get-number-btn');
    setButtonLoading(btn, true, 'Requesting Number...');

    try {
        const response = await fetch(`${API_BASE_URL}/orders/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: employee.id, employeeName: employee.name })
        });
        const data = await response.json();

        if (data.success) {
            activeOrders.unshift(data.order);
            displayActiveNumbers();
            if (!smsCheckInterval) startSMSCheck();
            showToast('success', `✓ Number received: ${formatPhoneNumber(data.order.phoneNumber)}`);
            playSuccessSound();
            
            // Stop auto-buy on success
            toggleAutoBuy();
            showToast('info', '✓ Auto-buy stopped - Number assigned!');
        } else {
            // Only continue auto-buy for "no numbers available" error
            // Stop for other errors like NO_BALANCE, API errors, etc.
            const errorMsg = data.message || 'Failed to get number';
            
            if (errorMsg.toLowerCase().includes('no numbers') || errorMsg.includes('NO_NUMBERS')) {
                // Continue trying for no numbers error
                console.log('Auto-buy retry: ' + errorMsg);
            } else {
                // Stop auto-buy for other errors
                toggleAutoBuy();
                showToast('error', `⚠️ Auto-buy stopped: ${errorMsg}`);
            }
        }
    } catch (error) {
        // Stop auto-buy on connection errors
        toggleAutoBuy();
        showToast('error', '⚠️ Auto-buy stopped: Connection failed');
        console.error('Auto-buy connection error:', error);
    } finally {
        setButtonLoading(btn, false, '🚀 Get India Number Now');
    }
}

async function checkSMS(orderId = null, showButton = false) {
    const ordersToCheck = orderId ? activeOrders.filter(o => o.orderId === orderId) : activeOrders;
    if (showButton && orderId) {
        const btn = document.querySelector(`#order-${orderId} .check-sms-btn`);
        if (btn) setButtonLoading(btn, true, 'Checking...');
    }

    for (const order of ordersToCheck) {
        if (order.status !== 'pending') continue;
        try {
            const response = await fetch(`${API_BASE_URL}/orders/check-sms/${order.orderId}`);
            const data = await response.json();

            if (data.success) {
                if (data.smsCode) {
                    const index = activeOrders.findIndex(o => o.orderId === order.orderId);
                    if (index !== -1) {
                        activeOrders[index] = data.order;
                        displayActiveNumbers();
                        showToast('success', `✓ SMS Received! Code: ${data.smsCode}`, 8000);
                        playNotificationSound();
                        highlightOrder(order.orderId);
                        // Restart timer for completed order (20 min countdown for auto-dismiss)
                        startTimer(order.orderId, order.createdAt || data.order.createdAt, true);
                    }
                } else if (data.order && data.order.status === 'cancelled') {
                    activeOrders = activeOrders.filter(o => o.orderId !== order.orderId);
                    displayActiveNumbers();
                    showToast('warning', `Order ${formatPhoneNumber(order.phoneNumber)} was cancelled or expired.`);
                }
            }
        } catch (error) {
            console.error('Error checking SMS:', error);
            if (showButton) showToast('error', 'Failed to check SMS. Please try again.');
        }
    }

    if (showButton && orderId) {
        const btn = document.querySelector(`#order-${orderId} .check-sms-btn`);
        if (btn) setButtonLoading(btn, false, '🔄 Check SMS');
    }
}

async function cancelNumber(orderId) {
    const btn = document.querySelector(`#order-${orderId} .cancel-btn`);
    if (btn) setButtonLoading(btn, true, 'Cancelling...');

    try {
        const response = await fetch(`${API_BASE_URL}/orders/cancel/${orderId}`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            const orderElement = document.getElementById(`order-${orderId}`);
            if (orderElement) {
                orderElement.style.opacity = '0';
                orderElement.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    activeOrders = activeOrders.filter(o => o.orderId !== orderId);
                    displayActiveNumbers();
                }, 300);
            } else {
                activeOrders = activeOrders.filter(o => o.orderId !== orderId);
                displayActiveNumbers();
            }
            showToast('success', '✓ Number cancelled successfully');
        } else {
            showToast('error', data.message || 'Failed to cancel order');
            if (btn) setButtonLoading(btn, false, '✕ Cancel');
        }
    } catch (error) {
        showToast('error', 'Failed to cancel. Please try again.');
        console.error('Error:', error);
        if (btn) setButtonLoading(btn, false, '✕ Cancel');
    }
}

function displayActiveNumbers() {
    const container = document.getElementById('active-numbers-container');
    const activeCount = activeOrders.filter(o => o.status === 'pending').length;
    const counterEl = document.getElementById('active-count');
    if (counterEl) {
        counterEl.textContent = activeCount;
        counterEl.parentElement.parentElement.style.animation = 'pulse 0.3s ease-in-out';
    }

    if (activeOrders.length === 0) {
        container.innerHTML = '<div class="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700"><svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg><p class="text-xl font-semibold mb-2">No Active Orders</p><p class="text-sm">Click the button above to request your first number</p></div>';
        return;
    }

    container.innerHTML = activeOrders.map((order, index) => {
        const orderId = order.orderId;
        const isCompleted = order.status === 'completed' || order.smsCode;
        const bgColor = isCompleted ? 'bg-green-50 dark:bg-green-900' : 'bg-orange-50 dark:bg-orange-900';
        const borderColor = isCompleted ? 'border-green-200' : 'border-orange-200';

        return `
            <div class="order-card p-3 bg-white dark:bg-gray-800 rounded-lg border ${borderColor} shadow-sm" id="order-${orderId}" style="animation: slideInUp 0.3s ease-out ${index * 0.1}s both;">
                <!-- Header -->
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">📱</span>
                        <span class="font-semibold text-gray-800 dark:text-gray-200">Whatsapp</span>
                    </div>
                    <span class="text-xs px-2 py-1 rounded-full ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'} font-medium">
                        ${isCompleted ? '✓ Done' : '⏱ Waiting'}
                    </span>
                </div>

                <!-- Phone Number -->
                <div class="mb-3">
                    <div class="flex items-center gap-1 mb-1">
                        <span class="text-orange-600 dark:text-orange-400 text-sm">📞</span>
                        <span class="text-xs text-gray-600 dark:text-gray-400 font-medium">Phone Number</span>
                    </div>
                    <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                        <span class="font-mono font-semibold text-gray-800 dark:text-gray-200">${formatPhoneNumber(order.phoneNumber)}</span>
                        <button onclick="copyToClipboard('${order.phoneNumber.slice(2)}', 'Phone')" class="text-gray-500 hover:text-blue-600" title="Copy">📋</button>
                    </div>
                </div>

                <!-- Status -->
                <div class="mb-3">
                    <div class="flex items-center gap-1 mb-1">
                        <span class="text-orange-600 dark:text-orange-400 text-sm">⚡</span>
                        <span class="text-xs text-gray-600 dark:text-gray-400 font-medium">Status</span>
                    </div>
                    <div class="p-2 ${bgColor} rounded border ${borderColor}">
                        ${isCompleted ? `
                            <div class="flex items-center justify-between">
                                <span class="text-sm font-semibold text-green-700 dark:text-green-400">✓ SMS Received</span>
                            </div>
                            <div class="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-green-300">
                                <div class="flex items-center justify-between">
                                    <span class="font-mono text-lg font-bold text-green-600 dark:text-green-400" id="sms-${orderId}">${order.smsCode}</span>
                                    <button onclick="copyToClipboard('${order.smsCode}', 'Code')" class="text-xs px-2 py-1 bg-green-600 text-white rounded font-semibold hover:bg-green-700">Copy</button>
                                </div>
                            </div>
                        ` : `
                            <div class="flex items-center gap-2 mb-1">
                                <div class="animate-spin text-orange-600">⏳</div>
                                <span class="text-sm font-semibold text-orange-700 dark:text-orange-400" id="sms-${orderId}">Waiting for SMS...</span>
                            </div>
                            <div class="w-full bg-orange-200 dark:bg-orange-800 rounded-full h-1.5 mb-2">
                                <div class="bg-orange-600 h-1.5 rounded-full animate-pulse" style="width: 60%"></div>
                            </div>
                            <div class="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                                <span>⏰</span>
                                <span>SMS expected soon</span>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Timer & Actions -->
                <div class="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div class="flex items-center gap-1 text-sm font-semibold ${isCompleted ? 'text-green-600' : 'text-orange-600'}">
                        <span>⏱</span>
                        <span class="timer-display" id="timer-${orderId}">${isCompleted ? '20:00' : '20:00'}</span>
                    </div>
                    ${isCompleted ? `
                        <button onclick="dismissNumber('${orderId}')" class="dismiss-btn px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                            ✓ Dismiss
                        </button>
                    ` : `
                        <button onclick="cancelNumber('${orderId}')" class="cancel-btn px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors">
                            ✕ Cancel
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');

    activeOrders.forEach(order => {
        startTimer(order.orderId, order.createdAt || order.date, order.status === 'completed' || order.smsCode);
    });
}

function startTimer(orderId, createdAt, isCompleted = false) {
    if (timerIntervals[orderId]) clearInterval(timerIntervals[orderId]);

    const updateTimer = () => {
        const now = new Date();
        const start = new Date(createdAt);
        const elapsed = Math.floor((now - start) / 1000);
        const remaining = Math.max(0, 1200 - elapsed);
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        const timerElement = document.getElementById(`timer-${orderId}`);
        
        if (timerElement && !timerElement.classList.contains('timer-display')) return;
        if (timerElement) {
            timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            timerElement.classList.remove('text-blue-600', 'text-yellow-600', 'text-red-600', 'text-green-600', 'dark:text-blue-400', 'dark:text-yellow-400', 'dark:text-red-400', 'dark:text-green-400');
            
            if (remaining === 0) {
                timerElement.textContent = 'EXPIRED';
                timerElement.classList.add('text-red-600', 'dark:text-red-400', 'animate-pulse');
                clearInterval(timerIntervals[orderId]);
                delete timerIntervals[orderId];
                
                if (isCompleted) {
                    // Auto-dismiss completed order after 20 min
                    showToast('info', `Completed order auto-dismissed`);
                    setTimeout(() => dismissNumber(orderId), 1000);
                } else {
                    // Auto-cancel pending order after 20 min (no OTP)
                    showToast('warning', `Order expired - No OTP received`);
                    setTimeout(() => cancelExpiredOrder(orderId), 2000);
                }
            } else if (isCompleted) {
                timerElement.classList.add('text-green-600', 'dark:text-green-400');
            } else if (remaining <= 60) {
                timerElement.classList.add('text-red-600', 'dark:text-red-400', 'animate-pulse');
            } else if (remaining <= 300) {
                timerElement.classList.add('text-red-600', 'dark:text-red-400');
            } else if (remaining <= 600) {
                timerElement.classList.add('text-yellow-600', 'dark:text-yellow-400');
            } else {
                timerElement.classList.add('text-blue-600', 'dark:text-blue-400');
            }
        }
    };

    updateTimer();
    timerIntervals[orderId] = setInterval(updateTimer, 1000);
}

async function dismissNumber(orderId) {
    const btn = document.querySelector(`#order-${orderId} .dismiss-btn`);
    if (btn) setButtonLoading(btn, true, 'Dismissing...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/dismiss/${orderId}`, { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            // Clean up timer
            if (timerIntervals[orderId]) {
                clearInterval(timerIntervals[orderId]);
                delete timerIntervals[orderId];
            }
            
            // Smooth remove animation
            const orderElement = document.getElementById(`order-${orderId}`);
            if (orderElement) {
                orderElement.style.opacity = '0';
                orderElement.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    activeOrders = activeOrders.filter(o => o.orderId !== orderId);
                    displayActiveNumbers();
                }, 300);
            } else {
                activeOrders = activeOrders.filter(o => o.orderId !== orderId);
                displayActiveNumbers();
            }
            showToast('success', '✓ Number dismissed');
        } else {
            showToast('error', data.message || 'Failed to dismiss order');
            if (btn) setButtonLoading(btn, false, '✓ Dismiss');
        }
    } catch (error) {
        console.error('Error dismissing order:', error);
        showToast('error', 'Failed to dismiss. Please try again.');
        if (btn) setButtonLoading(btn, false, '✓ Dismiss');
    }
}

async function cancelExpiredOrder(orderId) {
    try {
        await fetch(`${API_BASE_URL}/orders/cancel/${orderId}`, { method: 'POST' });
        if (timerIntervals[orderId]) {
            clearInterval(timerIntervals[orderId]);
            delete timerIntervals[orderId];
        }
        activeOrders = activeOrders.filter(o => o.orderId !== orderId);
        displayActiveNumbers();
    } catch (error) {
        console.error('Failed to auto-cancel expired order:', error);
    }
}

function startSMSCheck() {
    if (smsCheckInterval) return;
    smsCheckInterval = setInterval(() => {
        if (activeOrders.some(o => o.status === 'pending' && !o.smsCode)) {
            checkSMS();
        } else if (activeOrders.length === 0) {
            stopSMSCheck();
        }
    }, 5000);
}

function stopSMSCheck() {
    if (smsCheckInterval) {
        clearInterval(smsCheckInterval);
        smsCheckInterval = null;
    }
}

function showToast(type, message, duration = 5000) {
    toastQueue.push({ type, message, duration });
    if (!isShowingToast) displayNextToast();
}

function displayNextToast() {
    if (toastQueue.length === 0) {
        isShowingToast = false;
        return;
    }
    isShowingToast = true;
    const { type, message, duration } = toastQueue.shift();
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const colors = { success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-yellow-500', info: 'bg-blue-500' };
    const toastId = 'toast-' + Date.now();
    const toastHTML = `<div id="${toastId}" class="toast-notification fixed top-4 right-4 z-50 flex items-center gap-3 ${colors[type]} text-white px-6 py-4 rounded-lg shadow-2xl transform translate-x-full transition-transform duration-300 max-w-md"><div class="text-2xl font-bold">${icons[type]}</div><div class="flex-1"><p class="font-semibold text-sm">${message}</p></div><button onclick="closeToast('${toastId}')" class="text-white hover:text-gray-200 text-xl font-bold ml-2">×</button></div>`;
    document.body.insertAdjacentHTML('beforeend', toastHTML);
    const toastEl = document.getElementById(toastId);
    setTimeout(() => { toastEl.style.transform = 'translateX(0)'; }, 10);
    setTimeout(() => { closeToast(toastId); }, duration);
}

function closeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.style.transform = 'translateX(150%)';
        setTimeout(() => {
            toast.remove();
            displayNextToast();
        }, 300);
    } else {
        displayNextToast();
    }
}

async function copyToClipboard(text, label = 'Text') {
    try {
        await navigator.clipboard.writeText(text);
        showToast('success', `${label} copied to clipboard!`, 2000);
    } catch (error) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('success', `${label} copied!`, 2000);
        } catch (err) {
            showToast('error', 'Failed to copy. Please try manually.');
        }
        document.body.removeChild(textarea);
    }
}

    if (autoBuyInterval) clearInterval(autoBuyInterval);
function setButtonLoading(button, isLoading, text = '') {
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.innerHTML = `<svg class="animate-spin inline-block h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>${text}`;
    } else {
        button.disabled = false;
        button.textContent = text || button.dataset.originalText || 'Button';
    }
}

function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        const dialogId = 'confirm-dialog-' + Date.now();
        const dialogHTML = `<div id="${dialogId}" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm" style="animation: fadeIn 0.2s ease-out;"><div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 transform scale-95" style="animation: scaleIn 0.2s ease-out forwards;"><div class="p-6"><h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3">${title}</h3><p class="text-gray-600 dark:text-gray-300 mb-6">${message}</p><div class="flex gap-3 justify-end"><button onclick="closeDialog('${dialogId}', false)" class="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancel</button><button onclick="closeDialog('${dialogId}', true)" class="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Confirm</button></div></div></div></div>`;
        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        window.closeDialog = (id, result) => {
            const dialog = document.getElementById(id);
            if (dialog) {
                dialog.style.animation = 'fadeOut 0.2s ease-out';
                setTimeout(() => {
                    dialog.remove();
                    resolve(result);
                }, 200);
            }
        };
    });
}

function highlightOrder(orderId) {
    const orderEl = document.getElementById(`order-${orderId}`);
    if (orderEl) orderEl.style.animation = 'pulse 1s ease-in-out 3';
}

function playSuccessSound() {
    try {
        const audio = new Audio('../assets/sounds/number-buyed.wav');
        audio.volume = 0.5;
        audio.play().catch(() => {});
    } catch (e) {
        console.error('Failed to play success sound:', e);
    }
}

function playNotificationSound() {
    try {
        // Play SMS received notification sound
        const audio = new Audio('../assets/sounds/sms-received.wav');
        audio.volume = 0.7;
        audio.play().catch(() => {});
    } catch (e) {
        console.error('Failed to play notification sound:', e);
    }
}

window.addEventListener('beforeunload', () => {
    stopSMSCheck();
    Object.values(timerIntervals).forEach(interval => clearInterval(interval));
});

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); box-shadow: 0 0 20px rgba(34, 197, 94, 0.5); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .order-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    .pulse-animation { animation: pulse 2s ease-in-out infinite; }
    .toast-notification { box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3); }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }
`;
document.head.appendChild(style);
