const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Employee = require('../models/Employee');

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Today's statistics
        const todayOrders = await Order.countDocuments({ date: todayStr });
        const todayCompleted = await Order.countDocuments({ date: todayStr, status: 'completed' });
        const todayPending = await Order.countDocuments({ date: todayStr, status: 'pending' });
        const todayCancelled = await Order.countDocuments({ date: todayStr, status: 'cancelled' });

        // Monthly statistics
        const allOrders = await Order.find();
        const monthlyOrders = allOrders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        });

        const monthCompleted = monthlyOrders.filter(o => o.status === 'completed').length;
        const monthPending = monthlyOrders.filter(o => o.status === 'pending').length;
        const monthCancelled = monthlyOrders.filter(o => o.status === 'cancelled').length;

        // All time statistics
        const totalOrders = await Order.countDocuments();
        const totalCompleted = await Order.countDocuments({ status: 'completed' });
        const totalEmployees = await Employee.countDocuments();
        const activeEmployees = await Employee.countDocuments({ status: 'active' });
        
        const successRate = totalOrders > 0 ? Math.round((totalCompleted / totalOrders) * 100) : 0;

        // Get all employees and orders for frontend processing
        const employees = await Employee.find();

        // Calculate top performers
        const employeePerformance = employees.map(emp => {
            const empOrders = allOrders.filter(o => {
                const orderId = o.employeeId ? o.employeeId.toString() : null;
                return orderId === emp._id.toString();
            });
            const empCompleted = empOrders.filter(o => o.status === 'completed').length;
            return {
                name: emp.name,
                totalOrders: empOrders.length,
                completedOrders: empCompleted,
                successRate: empOrders.length > 0 ? Math.round((empCompleted / empOrders.length) * 100) : 0
            };
        });
        const topPerformers = employeePerformance
            .sort((a, b) => b.completedOrders - a.completedOrders)
            .slice(0, 5);

        // Get recent orders
        const recentOrders = allOrders
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        res.json({
            success: true,
            stats: {
                totalEmployees,
                activeEmployees,
                totalOrders,
                completedOrders: totalCompleted,
                allOrders: allOrders,
                employees: employees,
                topPerformers: topPerformers,
                recentOrders: recentOrders,
                today: {
                    orders: todayOrders,
                    completed: todayCompleted,
                    pending: todayPending,
                    cancelled: todayCancelled
                },
                monthly: {
                    orders: monthlyOrders.length,
                    completed: monthCompleted,
                    pending: monthPending,
                    cancelled: monthCancelled
                },
                allTime: {
                    orders: totalOrders,
                    completed: totalCompleted,
                    employees: totalEmployees,
                    activeEmployees,
                    successRate
                }
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching statistics', 
            error: error.message 
        });
    }
});

// Get employee performance statistics
router.get('/employee-stats', async (req, res) => {
    try {
        const { period } = req.query; // 'today', 'month', 'all'
        
        const employees = await Employee.find();
        const allOrders = await Order.find();

        // Use UTC date to match how orders are created
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const currentMonth = today.getUTCMonth();
        const currentYear = today.getUTCFullYear();

        // Filter orders by period
        let filteredOrders = allOrders;
        if (period === 'today') {
            filteredOrders = allOrders.filter(o => o.date === todayStr);
        } else if (period === 'month') {
            filteredOrders = allOrders.filter(order => {
                const orderDate = new Date(order.date + 'T00:00:00Z');
                return orderDate.getUTCMonth() === currentMonth && orderDate.getUTCFullYear() === currentYear;
            });
        }

        const employeeStats = employees.map(emp => {
            const empOrders = filteredOrders.filter(o => {
                const orderId = o.employeeId ? o.employeeId.toString() : null;
                return orderId === emp._id.toString();
            });
            const completed = empOrders.filter(o => o.status === 'completed').length;
            const pending = empOrders.filter(o => o.status === 'pending').length;
            const cancelled = empOrders.filter(o => o.status === 'cancelled').length;
            const successRate = empOrders.length > 0 ? Math.round((completed / empOrders.length) * 100) : 0;

            // Get last activity
            const empAllOrders = allOrders.filter(o => {
                const orderId = o.employeeId ? o.employeeId.toString() : null;
                return orderId === emp._id.toString();
            });
            const lastActivity = empAllOrders.length > 0
                ? empAllOrders.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time))[0].date
                : 'Never';

            return {
                id: emp._id,
                name: emp.name,
                totalOrders: empOrders.length,
                completed,
                pending,
                cancelled,
                successRate,
                lastActivity
            };
        });

        // Sort by total orders
        employeeStats.sort((a, b) => b.totalOrders - a.totalOrders);

        res.json({
            success: true,
            employeeStats: employeeStats
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching employee statistics', 
            error: error.message 
        });
    }
});

// Get top performers
router.get('/top-performers', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const todayOrders = await Order.find({ date: todayStr });
        const employees = await Employee.find();

        const performanceMap = employees.map(emp => {
            const empOrders = todayOrders.filter(o => o.employeeId.toString() === emp._id.toString());
            const empCompleted = empOrders.filter(o => o.status === 'completed').length;
            const empSuccessRate = empOrders.length > 0 
                ? Math.round((empCompleted / empOrders.length) * 100) 
                : 0;

            return {
                name: emp.name,
                ordersCount: empOrders.length,
                completed: empCompleted,
                successRate: empSuccessRate
            };
        });

        // Filter and sort
        const topPerformers = performanceMap
            .filter(p => p.ordersCount > 0)
            .sort((a, b) => b.ordersCount - a.ordersCount)
            .slice(0, 5);

        res.json({
            success: true,
            performers: topPerformers
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching top performers', 
            error: error.message 
        });
    }
});

module.exports = router;
