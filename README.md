# RansomHub - Secure Social Media & Marketplace Platform

![RansomHub Logo](https://img.shields.io/badge/RansomHub-Secure%20Social%20Platform-blue)


## 📋 Overview

RansomHub is a comprehensive secure social media platform with an integrated P2P marketplace, featuring end-to-end encrypted communications, robust user verification, and blockchain implementation for message integrity. Built with security at its core, RansomHub ensures confidentiality, integrity, and availability of all user interactions.

## ✨ Features

### 🔐 Security Features
- End-to-end encrypted conversations (one-to-one and group messaging)
- PKI for secure operations
- OTP-based authentication with virtual keyboard
- Secure media sharing with encryption in transit
- Blockchain implementation for message integrity

### 👥 Social Features
- User profiles with customizable pictures
- Follow/friend request system
- Post creation with images and captions
- Like and comment functionality
- User search capabilities

### 🛒 Marketplace
- Item listing and selling
- Secure payment processing (credit card and cryptocurrency)
- Search and filter functionality
- Item status tracking

### 👮‍♀️ Admin Functions
- User management and verification
- Content moderation
- Security audits and logs
- Suspicious activity monitoring

## 🔧 Tech Stack

### Backend
- Python/Django
- MySQL/PostgreSQL Database
- HTTPS/SSL/TLS for secure data transmission

### Frontend
- React.js
- Node.js
- Modern responsive UI

## 🚀 Installation & Setup

### Prerequisites
- Python 3.x
- Node.js and npm
- Virtual environment tool (venv)
- Git

### Backend Setup
```bash
# Clone the repository
git clone https://github.com/RansomHubbies/RansomHub-Backend.git

# Navigate to the backend directory
cd RansomHub-Backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # For Linux/Mac
# OR
venv\Scripts\activate  # For Windows

# Install required packages
pip install -r requirements.txt

# Configure local settings
# Modify backend/settings.py according to comments for local development

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Start the development server
python manage.py runserver 8000
```

### Frontend Setup
```bash
# Clone the repository
git clone https://github.com/RansomHubbies/RansomHub-Frontend.git

# Navigate to the frontend directory
cd RansomHub-Frontend/ransomhub

# Install dependencies
npm install

# Configure API endpoint
# In api.js, comment the 192.168.2.233 line and uncomment localhost for development

# Start the development server
npm run dev
```

Once both servers are running:
- Frontend: http://127.0.0.2:3000
- Backend Admin: http://127.0.0.1:8000/api/admin

## 📱 User Guide

### Registration & Login
1. Sign up with full name, username, email, phone number, and password
2. Verify email via OTP
3. Login with credentials

### Dashboard & Social Features
- Upload/change profile picture
- Manage follow requests
- Create posts with captions and images
- Follow other users and like posts

### Account Verification
- Upload government ID (passport, driver's license, or national ID)
- Await verification approval
- Access additional features (chats, marketplace) after verification

### Chats
- One-to-one and group chats
- Send messages and attachments
- Create new group conversations
- Add members to existing groups

### Marketplace
- Browse items with search and filter capabilities
- List items for sale with details and images
- Purchase items using credit card or cryptocurrency
- Verify purchases via OTP

## 👥 Contributors

- Akash Kushwaha (2021514)
- Chirag Kumar Banka (2021142)
- Manav Mittal (2021538)
- Naman Garg (2021171)
- Shubham Pal (2021564)


## 🔒 Security Features

RansomHub implements various security mechanisms including:

- **Encryption**: End-to-end encryption for all communications
- **Authentication**: Multi-factor authentication with OTP
- **Blockchain**: Private blockchain implementation for message integrity
- **Secure Logging**: Tamper-resistant audit trails
- **Attack Prevention**: Defenses against SQL injection, XSS, CSRF, and session hijacking

