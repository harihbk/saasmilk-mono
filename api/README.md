# Milk Company SaaS API

A comprehensive Node.js REST API for managing a milk company's operations including products, orders, customers, suppliers, inventory, and user management with role-based access control.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **User Management**: Admin, Manager, Employee, and Customer roles
- **Product Management**: Comprehensive product catalog with categories and pricing
- **Order Management**: Full order lifecycle with status tracking and payment processing
- **Customer Management**: Individual and business customer profiles with loyalty programs
- **Supplier Management**: Supplier onboarding, performance tracking, and quality management
- **Inventory Management**: Real-time stock tracking, batch management, and automated alerts
- **SaaS Features**: Multi-tenant architecture with subscription plans and usage limits

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting
- **Password Hashing**: bcryptjs

## Project Structure

```
api/
├── config/
│   └── database.js          # Database configuration
├── middleware/
│   ├── auth.js              # Authentication & authorization middleware
│   └── validation.js        # Input validation middleware
├── models/
│   ├── User.js              # User model with roles and subscriptions
│   ├── Product.js           # Product catalog model
│   ├── Order.js             # Order management model
│   ├── Customer.js          # Customer profile model
│   ├── Supplier.js          # Supplier management model
│   └── Inventory.js         # Inventory tracking model
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User management routes
│   ├── products.js          # Product management routes
│   ├── orders.js            # Order management routes
│   ├── customers.js         # Customer management routes
│   ├── suppliers.js         # Supplier management routes
│   └── inventory.js         # Inventory management routes
├── .env.example             # Environment variables template
├── package.json             # Dependencies and scripts
└── server.js                # Main application entry point
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd milk-company-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/milk-company
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=30d
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password

### Users (Admin/Manager only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get single user
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user  
- `DELETE /api/users/:id` - Deactivate user
- `PUT /api/users/:id/subscription` - Update user subscription
- `GET /api/users/meta/stats` - Get user statistics

### Products
- `GET /api/products` - Get all products (with filtering, search, pagination)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Mark product as discontinued
- `GET /api/products/meta/categories` - Get product categories
- `GET /api/products/meta/brands` - Get product brands
- `GET /api/products/alerts/low-stock` - Get low stock products

### Orders
- `GET /api/orders` - Get all orders (with filtering, search, pagination)
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status
- `PUT /api/orders/:id/assign` - Assign order to user
- `PUT /api/orders/:id/payment` - Update payment status
- `GET /api/orders/meta/stats` - Get order statistics

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get single customer
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Deactivate customer
- `POST /api/customers/:id/notes` - Add note to customer
- `PUT /api/customers/:id/assign` - Assign customer to salesperson
- `PUT /api/customers/:id/loyalty` - Update loyalty points
- `GET /api/customers/meta/stats` - Get customer statistics

### Suppliers
- `GET /api/suppliers` - Get all suppliers
- `GET /api/suppliers/:id` - Get single supplier
- `POST /api/suppliers` - Create new supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Deactivate supplier
- `POST /api/suppliers/:id/notes` - Add note to supplier
- `PUT /api/suppliers/:id/assign` - Assign supplier to buyer
- `PUT /api/suppliers/:id/performance` - Update supplier performance
- `GET /api/suppliers/meta/stats` - Get supplier statistics

### Inventory
- `GET /api/inventory` - Get all inventory items
- `GET /api/inventory/:id` - Get single inventory item
- `POST /api/inventory` - Create new inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `POST /api/inventory/:id/movements` - Add stock movement
- `POST /api/inventory/:id/reserve` - Reserve stock
- `POST /api/inventory/:id/release` - Release reserved stock
- `GET /api/inventory/meta/alerts` - Get inventory alerts
- `PUT /api/inventory/:id/alerts/:alertId/acknowledge` - Acknowledge alert

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Role-Based Access Control

The API implements four user roles with different permissions:

- **Admin**: Full system access
- **Manager**: Management operations, user oversight
- **Employee**: Day-to-day operations, assigned tasks
- **Customer**: Limited access to own data

## SaaS Features

### Subscription Plans
- **Free**: Basic features with limitations
- **Basic**: Standard business features
- **Premium**: Advanced features and analytics
- **Enterprise**: Full feature set with custom limits

### Multi-tenancy
- User isolation based on organization
- Subscription-based feature access
- Usage tracking and limits

## Data Models

### User
- Personal information and authentication
- Role-based permissions
- Subscription details
- Activity tracking

### Product
- Comprehensive product information
- Pricing and packaging details
- Category and brand management
- Status tracking

### Order
- Complete order lifecycle
- Item details and pricing
- Payment and shipping information
- Status timeline

### Customer
- Personal and business information
- Multiple addresses
- Loyalty program integration
- Purchase history and statistics

### Supplier
- Company and contact information
- Quality standards and certifications
- Performance metrics
- Financial details

### Inventory
- Real-time stock levels
- Batch tracking and expiry management
- Movement history
- Automated alerts and thresholds

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"]
}
```

## Validation

All inputs are validated using express-validator with:
- Data type validation
- Length and format constraints
- Business rule validation
- Sanitization for security

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling
- **Input Validation**: Comprehensive validation
- **Password Hashing**: bcrypt with salt
- **JWT Authentication**: Secure token-based auth

## Development

### Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests (if configured)
```

### Environment Variables
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: JWT signing secret
- `JWT_EXPIRE`: JWT expiration time

## API Testing

You can test the API using tools like:
- Postman
- Insomnia
- curl
- Thunder Client (VS Code extension)

Example request:
```bash
curl -X GET http://localhost:5000/api/products \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.
