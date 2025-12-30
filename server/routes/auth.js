const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');

// Employee Login
router.post('/employee/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const employee = await Employee.findOne({ 
            username: username.toLowerCase(), 
            password: password,
            status: 'active'
        });

        if (!employee) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password, or account is inactive.' 
            });
        }

        res.json({
            success: true,
            message: 'Login successful',
            employee: {
                id: employee._id,
                username: employee.username,
                name: employee.name,
                email: employee.email
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// Admin Login
router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const Admin = require('../models/Admin');

        let admin = await Admin.findOne({ username: username });

        // Create default admin if doesn't exist
        if (!admin) {
            admin = await Admin.create({
                username: process.env.ADMIN_USERNAME || 'admin',
                password: process.env.ADMIN_PASSWORD || 'admin123'
            });
        }

        if (admin.username !== username || admin.password !== password) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid admin credentials.' 
            });
        }

        res.json({
            success: true,
            message: 'Admin login successful',
            admin: {
                username: admin.username,
                role: 'admin'
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
});

module.exports = router;
