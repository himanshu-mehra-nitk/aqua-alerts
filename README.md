
# AquaAlerts - Water Consumption Monitoring System
## 📋 Project Overview

AquaAlerts is a comprehensive web-based water consumption monitoring system that helps users track, analyze, and optimize their daily water usage. The application provides real-time insights, conservation tips, and detailed analytics through an intuitive dashboard interface.


## 🚀 Live Demo
- Frontend: Open frontend/index.html in your web browser
- Backend API: http://localhost:5000
- Database: MongoDB Atlas (cloud)

## 🛠️ Technology Stack
### Frontend
- HTML5 - Structure and semantics
- CSS3 - Styling and responsive design
- Vanilla JavaScript - Client-side functionality
- Chart.js - Data visualization
### Backend
- Node.js - Runtime environment
- Express.js - Web application framework
- MongoDB - Database management
- Mongoose - MongoDB object modeling
- JWT - Authentication tokens
- bcryptjs - Password hashing
- CORS - Cross-origin resource sharing
- Nodemailer - Email service for OTP
### Security
- JWT Authentication - Secure user sessions
- Password Hashing - bcrypt with salt rounds
- CORS Protection - Controlled API access
- Input Validation - Server-side data sanitization
- OTP Verification - Email-based verification system
- Email Validation API - Real email verification during registration

## ✅ Completed Features
### 🔐 Authentication & Authorization
- User registration with OTP email verification
- Role selection (User/Admin) during registration
- Secure login/logout system
- JWT token-based authentication
- Password hashing with bcrypt
- Role-based access control
- Email OTP system for secure registration
- Email existence verification using EmailValidation.io API

### 👤 User Dashboard
- Daily water usage tracking
- Real-time consumption statistics
- Interactive historical charts with threshold lines
- Threshold-based alert system
- Smart conservation tips generation
- Data simulation for testing
- Profile management (name, email, password, threshold [not for admin])
- Account deletion functionality


### 👑 Admin Dashboard
- Complete user management system
- View all registered users and admins
- Individual user dashboard access
- User statistics monitoring
- Threshold management for users
- User deletion capabilities
- Profile management for admins
### 📊 Data Management
- CRUD operations for water usage
- Historical data visualization
- Statistical calculations (today, weekly, monthly)
- Data simulation with configurable days
- Non-continuous chart plotting
- Alert generation and dismissal
- Automatic alert creation when thresholds are exceeded
### 🎨 User Interface
- Responsive design for all devices
- Modern card-based layout
- Interactive charts with Chart.js
- Toast notification system
- Professional color scheme
- Color-coded usage indicators (green/yellow/red)
- Accessible form designs


## 🚀 Setup and Installation
Follow these steps to get the AquaAlerts system up and running on your local machine.

### Prerequisites

You must have the following software installed:
- Node.js (v18 or higher recommended)
- npm (comes with Node.js)
- Modern Web browser (Chrome, Firefox, Safari, or Edge)

### Step 1: Install Dependencies
- In your terminal, navigate to the backend folder.
- Install the required Node.js packages:
```bash
cd backend
npm install
npm install nodemailer
```

### Step 2: Run the Server

Start the Express server. This command will also attempt to connect to your local MongoDB instance.
```bash
node server.js
# OR: npm start
```
You should see output confirming the server is running on port 5000 and the MongoDB connection is successful:
```bash
Server running on port 5000
Environment: development
Email server is ready to send messages
MongoDB connected
```
### Step 3: Launch Frontend
- Open the frontend/index.html file in your web browser
- The application will automatically connect to the backend API

## 📊 API Endpoints
### Authentication
- POST /api/auth/send-register-otp - Send OTP for registration
- POST /api/auth/verify-register-otp - Verify OTP and complete registration
- POST /api/auth/login - User login (without OTP)
- GET /api/auth/me - Get current user
- PUT /api/auth/profile - Update profile
- DELETE /api/auth/account - Delete account

### Water Usage
- POST /api/usage - Add/update daily usage
- GET /api/usage - Get user usage data
- POST /api/usage/simulate - Generate simulated data

### Alerts
- GET /api/usage/alerts - Get active alerts
- PUT /api/alerts/:alertId - Dismiss alert

### Admin
- GET /api/admin/users - Get all users
- GET /api/admin/list-admins - Get all admins
- GET /api/admin/user-dashboard/:userId - Get user dashboard data
- PUT /api/admin/users/:userId - Update user threshold
- DELETE /api/admin/users/:userId - Delete user

## 🔧 Key Features Implementation
### OTP Email Verification
- Secure 6-digit OTP sent via email during registration
- 10-minute expiration timer
- Resend OTP functionality
- Automatic cleanup of expired OTPs
- Real email validation using EmailValidation.io API
### Smart Alert System
- Threshold Exceeded: When daily usage exceeds user's threshold
- Approaching Limit: When usage reaches 90% of threshold
- Conservation Tips: AI-generated tips based on usage patterns
### Data Visualization
- Line charts showing historical water usage
- Threshold line for easy comparison
- Non-continuous plotting (only dates with data)
- Responsive chart design
- Color-coded statistics cards

### Admin Controls
- View all registered users and their statistics
- Modify user thresholds
- Access individual user dashboards
- Delete user accounts
- View all admin accounts

## ✅ Enhanced Features
- Color-coded Statistics: Visual indicators for usage levels
- Better Admin Controls: Improved user management interface
- Responsive Design: Mobile-friendly dashboard layouts
- Real-time Updates: Automatic dashboard refresh after actions

## 📁 Project Structure
```bash
aqua-alerts/
├── backend/
│   ├── config/
│   │   ├── database.js
│   │   ├── email.js
│   │   └── environment.js
│   ├── middleware/
│   │   ├── admin.js
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── WaterUsage.js
│   │   ├── Alert.js
│   │   └── OTP.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── usage.js
│   │   ├── alerts.js
│   │   └── admin.js
│   ├── utils/
│   │   ├── auth.js
│   │   ├── email.js
│   │   └── tips.js
│   ├── app.js
│   ├── server.js
│   ├── package-lock.json
│   ├── package.json
│   └── .env
└── frontend/
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        └── app.js
```
## 👤 Default Roles & Access
### User Role
- Track personal water usage
- View personal statistics and charts
- Receive personalized alerts and tips
- Manage own profile and account
- Generate simulated data for testing
### Admin Role
- All User capabilities PLUS:
- View all registered users
- Access any user's dashboard
- Modify user thresholds
- Delete user accounts
- View admin accounts list

## 🎯 Usage Instructions
### For New Users:
- Registration: Click "Register here" and complete OTP verification
- Role Selection: Choose between User or Admin role during registration
- Email Verification: Check email for 6-digit OTP (valid for 10 miutes)
### For Existing Users:
- Login: Use email and password to access dashboard
- Add Usage: Record daily water consumption (current year only)
- View Analytics: Monitor statistics, charts, and receive tips
- Manage Profile: Update information and water threshold
### For Admins:
- User Management: Access admin panel to view all users
- User Dashboard: Click "View Usage" to see individual user data
- Threshold Management: Update user thresholds as needed
- User Deletion: Remove users with proper confirmation

## 🔒 Security Features
- Email Validation: Real email verification during registration
- Password Security: bcrypt hashing with salt rounds
- Session Management: JWT tokens with expiration
- Role Protection: Middleware for admin-only routes
- Input Sanitization: Server-side validation for all inputs
- CORS Configuration: Controlled API access
##
- Developed by: Himanshu Mehar (231IT027)
- Project: Water Consumption Monitoring System
- Status: ✅ Production Ready - All Features Implemented and Tested
