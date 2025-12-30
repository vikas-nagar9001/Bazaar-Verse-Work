const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');

// Get all employees
router.get('/', async (req, res) => {
    try {
        const employees = await Employee.find().sort({ createdDate: -1 });
        res.json({ success: true, employees });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching employees', 
            error: error.message 
        });
    }
});

// Add new employee
router.post('/', async (req, res) => {
    try {
        const { name, username, email, password } = req.body;

        // Check if username already exists
        const existingEmployee = await Employee.findOne({ username: username.toLowerCase() });
        if (existingEmployee) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username already exists!' 
            });
        }

        const newEmployee = await Employee.create({
            name,
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password,
            status: 'active',
            createdDate: new Date()
        });

        res.status(201).json({
            success: true,
            message: 'Employee added successfully',
            employee: newEmployee
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error adding employee', 
            error: error.message 
        });
    }
});

// Update employee status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const employee = await Employee.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!employee) {
            return res.status(404).json({ 
                success: false, 
                message: 'Employee not found' 
            });
        }

        res.json({
            success: true,
            message: 'Employee status updated',
            employee
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error updating employee status', 
            error: error.message 
        });
    }
});

// Delete employee
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const employee = await Employee.findByIdAndDelete(id);

        if (!employee) {
            return res.status(404).json({ 
                success: false, 
                message: 'Employee not found' 
            });
        }

        // Also delete all orders by this employee
        const Order = require('../models/Order');
        await Order.deleteMany({ employeeId: id });

        res.json({
            success: true,
            message: 'Employee and their orders deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting employee', 
            error: error.message 
        });
    }
});

module.exports = router;
