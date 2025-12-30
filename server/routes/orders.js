const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const axios = require('axios');

// API Configuration from environment variables
const API_KEY = process.env.NUMERASMS_API_KEY;
const API_BASE_URL = process.env.NUMERASMS_API_URL;

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
            status: 'pending' 
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
        const url = `${API_BASE_URL}?api_key=${API_KEY}&action=getNumber&operator=9&service=tpgs&country=4&maxPrice=37`;
        
        const response = await axios.get(url);
        const data = response.data;

        if (data.startsWith('ACCESS_NUMBER')) {
            // Parse response: ACCESS_NUMBER:orderId:phoneNumber
            const parts = data.split(':');
            const orderId = parts[1];
            const phoneNumber = parts[2];

            // Create order in database
            const order = await Order.create({
                orderId,
                phoneNumber,
                employeeId,
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
        res.status(500).json({ 
            success: false, 
            message: 'Error requesting number', 
            error: error.message 
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
        const response = await axios.get(url);
        const data = response.data;

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
        res.status(500).json({ 
            success: false, 
            message: 'Error checking SMS', 
            error: error.message 
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
        const response = await axios.get(url);
        const data = response.data;

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
        res.status(500).json({ 
            success: false, 
            message: 'Error cancelling order', 
            error: error.message 
        });
    }
});

module.exports = router;
