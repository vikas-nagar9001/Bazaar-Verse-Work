# Employee Panel Server

## Installation

```bash
cd employee-panel/server
npm install
```

## Environment Variables

Make sure `.env` file exists in the root directory with:
```
MONGO_URI=mongodb+srv://vikasnagar221:Qwerty123@cluster0.xpoc4.mongodb.net/BazaarVerseWork
```

## Start Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

## Server will run on:
- http://localhost:3000

## API Endpoints

### Authentication
- `POST /api/auth/employee/login` - Employee login
- `POST /api/auth/admin/login` - Admin login

### Employees (Admin)
- `GET /api/employees` - Get all employees
- `POST /api/employees` - Add new employee
- `PATCH /api/employees/:id/status` - Update employee status
- `DELETE /api/employees/:id` - Delete employee

### Orders
- `GET /api/orders` - Get all orders (with filters)
- `GET /api/orders/employee/:employeeId` - Get employee orders
- `GET /api/orders/active/:employeeId` - Get active order
- `POST /api/orders/request` - Request new number
- `GET /api/orders/check-sms/:orderId` - Check SMS status
- `POST /api/orders/cancel/:orderId` - Cancel order

### Admin Stats
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/employee-stats?period=today` - Get employee statistics
- `GET /api/admin/top-performers` - Get top performers

### Health Check
- `GET /api/health` - Server health status
