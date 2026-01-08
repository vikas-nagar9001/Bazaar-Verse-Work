const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '..')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Import Routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Health Check Endpoint for Uptime Robot
app.get('/api/health', (req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    
    // Return 503 if database is not connected
    if (!dbConnected) {
        return res.status(503).json({ 
            status: 'ERROR',
            message: 'Database connection lost',
            timestamp: new Date().toISOString(),
            database: 'Disconnected',
            uptime: process.uptime()
        });
    }
    
    // Return 200 OK if everything is healthy
    res.status(200).json({ 
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        database: 'Connected',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve frontend pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../employee/login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/login.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Something went wrong!', 
        error: err.message 
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`👥 Employee Panel: http://localhost:${PORT}/employee/login.html`);
});
