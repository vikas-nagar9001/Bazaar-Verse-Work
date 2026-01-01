const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// API Configuration from environment variables
const API_KEY = process.env.NUMERASMS_API_KEY;
const API_BASE_URL = process.env.NUMERASMS_API_URL;

// Puppeteer browser instance (reuse to save resources)
let browserInstance = null;

// Get or create browser instance
async function getBrowser() {
    if (!browserInstance || !(await browserInstance.isConnected())) {
        browserInstance = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
    }
    return browserInstance;
}

// Puppeteer wrapper for Numera API calls (bypasses Cloudflare)
const numeraAPICall = async (url) => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    try {
        // Set realistic viewport
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Navigate to the API URL
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Wait a bit for any JS to execute
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get the response text
        const responseText = await page.evaluate(() => document.body.innerText);
        
        await page.close();
        return responseText;
    } catch (error) {
        await page.close();
        throw error;
    }
};

// Get all orders (with optional filters)
router.get('/', async (req, res) => {
    try {
        const { employeeId, status, date } = req.query;
        let filter = {};

        if (employeeId) filter.employeeId = employeeId;
        if (status) filter.status = status;
        if (date) filter.date = date;

        const orders = await Order.find(filter)
            .populate('employeeId', 'name email')
            .sort({ createdAt: -1 });

        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching orders', 
            error: error.message 
        });
    }
});

// Get orders for specific employee
router.get('/employee/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const orders = await Order.find({ employeeId }).sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching employee orders', 
            error: error.message 
        });
    }
});

// Get active orders for employee (multiple)
router.get('/active/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const activeOrders = await Order.find({ 
            employeeId, 
            status: { $in: ['pending', 'completed'] },
            dismissed: { $ne: true }
        }).sort({ createdAt: -1 });

        res.json({ 
            success: true, 
            activeOrders: activeOrders 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching active orders', 
            error: error.message 
        });
    }
});

// Request new number
router.post('/request', async (req, res) => {
    try {
        const { employeeId, employeeName } = req.body;

        // Call NumeraSMS API
        const url = `${API_BASE_URL}?api_key=${API_KEY}&action=getNumber&operator=9&service=tpgs&country=22&maxPrice=44`;
        
        const response = await numeraAPICall(url);
        const data = response;

        if (data.startsWith('ACCESS_NUMBER')) {
            // Parse response: ACCESS_NUMBER:orderId:phoneNumber
            const parts = data.split(':');
            const orderId = parts[1];
            const phoneNumber = parts[2];

            // Create order in database - ensure employeeId is ObjectId
            const order = await Order.create({
                orderId,
                phoneNumber,
                employeeId: new mongoose.Types.ObjectId(employeeId),
                employeeName,
                status: 'pending',
                smsCode: null,
                date: new Date().toISOString().split('T')[0],
                time: new Date().toTimeString().split(' ')[0],
                service: 'tpgs',
                operator: '9',
                country: '22'
            });

            res.status(201).json({
                success: true,
                message: 'Number received successfully',
                order
            });
        } else if (data === 'NO_NUMBERS') {
            res.status(404).json({
                success: false,
                message: 'No numbers currently available. Please try again later.'
            });
        } else {
            res.status(400).json({
                success: false,
                message: `API Error: ${data}`
            });
        }
    } catch (error) {
        console.error('❌ Error in /request endpoint:', {
            message: error.message,
            url: `${API_BASE_URL}?api_key=${API_KEY ? '[SET]' : '[MISSING]'}&action=getNumber...`,
            stack: error.stack
        });
        res.status(500).json({ 
            success: false, 
            message: 'Error requesting number', 
            error: error.message,
            details: error.response?.data || 'No response data'
        });
    }
});

// Check SMS status
router.get('/check-sms/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;

        // Find order in database
        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        // Call NumeraSMS API to check SMS
        const url = `${API_BASE_URL}?api_key=${API_KEY}&action=getStatus&id=${orderId}`;
        const response = await numeraAPICall(url);
        const data = response;

        if (data.startsWith('STATUS_OK')) {
            // Parse response: STATUS_OK:smsCode
            const smsCode = data.split(':')[1];
            
            // Update order in database
            order.status = 'completed';
            order.smsCode = smsCode;
            await order.save();

            res.json({
                success: true,
                message: 'SMS received',
                smsCode,
                order
            });
        } else if (data === 'STATUS_CANCEL') {
            // Update order as cancelled
            order.status = 'cancelled';
            await order.save();

            res.json({
                success: true,
                message: 'Order was cancelled or timed out',
                order
            });
        } else {
            res.json({
                success: true,
                message: 'SMS not yet received',
                status: data
            });
        }
    } catch (error) {
        console.error('❌ Error in /check-sms endpoint:', {
            message: error.message,
            orderId: req.params.orderId,
            stack: error.stack
        });
        res.status(500).json({ 
            success: false, 
            message: 'Error checking SMS', 
            error: error.message,
            details: error.response?.data || 'No response data'
        });
    }
});

// Cancel order
router.post('/cancel/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;

        // Find order in database
        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        // Call NumeraSMS API to cancel
        const url = `${API_BASE_URL}?api_key=${API_KEY}&action=setStatus&status=8&id=${orderId}`;
        const response = await numeraAPICall(url);
        const data = response;

        if (data === 'ACCESS_CANCEL' || data === 'ACCESS_CANCEL_ALREADY') {
            // Update order in database
            order.status = 'cancelled';
            await order.save();

            res.json({
                success: true,
                message: 'Number cancelled successfully',
                order
            });
        } else {
            res.status(400).json({
                success: false,
                message: `Failed to cancel: ${data}`
            });
        }
    } catch (error) {
        console.error('❌ Error in /cancel endpoint:', {
            message: error.message,
            orderId: req.params.orderId,
            stack: error.stack
        });
        res.status(500).json({ 
            success: false, 
            message: 'Error cancelling order', 
            error: error.message,
            details: error.response?.data || 'No response data'
        });
    }
});

// Dismiss completed order
router.post('/dismiss/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;

        // Find order in database
        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        // Mark as dismissed
        order.dismissed = true;
        await order.save();

        res.json({
            success: true,
            message: 'Order dismissed successfully',
            order
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error dismissing order', 
            error: error.message 
        });
    }
});

module.exports = router;
