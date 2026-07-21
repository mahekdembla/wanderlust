# 🌍 Wanderlust

A modern full-stack travel accommodation platform inspired by Airbnb, where users can discover, list, review, and manage vacation stays. Wanderlust provides a seamless booking experience with secure authentication, interactive maps, image uploads, wishlist functionality, and AI-powered travel assistance.

---

## 📌 Features

### 🔐 Authentication & Authorization
- User registration and login
- Secure authentication using Passport.js
- Session management with Express Session
- Authorization for listing ownership and reviews

### 🏡 Listing Management
- Create, edit, and delete property listings
- Upload multiple listing images using Cloudinary
- View detailed listing information
- Search and browse available stays

### ❤️ Wishlist
- Save favorite listings
- Remove listings from wishlist
- Personalized wishlist for every user

### ⭐ Reviews & Ratings
- Add reviews with star ratings
- Edit and delete reviews
- Review ownership protection

### 🗺️ Maps Integration
- Interactive location maps
- Property location visualization
- Geocoding support

### 💬 Real-time Chat
- Socket.IO powered messaging
- Instant communication experience

### 🤖 AI Travel Assistant
- AI-powered travel recommendations
- Destination suggestions
- Personalized itinerary guidance

### 📱 Responsive UI
- Mobile-friendly interface
- Modern Airbnb-inspired design
- Smooth navigation across devices

---

# 🛠️ Tech Stack

## Frontend
- HTML5
- CSS3
- Bootstrap 5
- JavaScript
- EJS

## Backend
- Node.js
- Express.js

## Database
- MongoDB Atlas
- Mongoose

## Authentication
- Passport.js
- Passport Local

## Cloud Services
- Cloudinary
- Mapbox

## Real-Time Communication
- Socket.IO

## AI Integration
- Google Gemini API

---

# 📂 Project Structure

```
wanderlust/
│
├── controllers/
├── models/
├── routes/
├── middleware/
├── public/
│   ├── css/
│   ├── js/
│   └── images/
│
├── views/
│   ├── layouts/
│   ├── listings/
│   ├── users/
│   └── partials/
│
├── utils/
├── cloudConfig.js
├── app.js
├── package.json
└── README.md
```

---

# ⚙️ Installation

Clone the repository

```bash
git clone https://github.com/mahekdembla/wanderlust.git
```

Navigate to the project

```bash
cd wanderlust
```

Install dependencies

```bash
npm install
```

Create a `.env` file in the root directory.

Example:

```env
ATLASDB_URL=your_mongodb_connection_string

SECRET=your_session_secret

CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret

MAP_TOKEN=your_mapbox_token

GEMINI_API_KEY=your_gemini_api_key
```

Start the application

```bash
npm start
```

The application will run on

```
http://localhost:8080
```

---

# 📸 Screenshots

Add screenshots of:

- Home Page
- Listing Details
- Login
- Create Listing
- Wishlist
- AI Travel Assistant
- Chat Interface

Create a folder named:

```
screenshots/
```

Example:

```
screenshots/
├── home.png
├── listing.png
├── login.png
├── wishlist.png
├── ai-planner.png
├── chat.png
```

Then display them like:

```markdown
## Home Page

![Home](screenshots/home.png)

## Listing Details

![Listing](screenshots/listing.png)
```

---

# 🚀 Future Improvements

- Booking System
- Online Payments
- Notifications
- Email Verification
- Advanced Filters
- Admin Dashboard
- Recommendation Engine
- AI Trip Planner Memory
- Multi-language Support

---

# 📚 What I Learned

This project helped me gain practical experience in:

- Full Stack Web Development
- REST APIs
- MVC Architecture
- Authentication & Authorization
- MongoDB Database Design
- Cloudinary Image Management
- Real-time Communication using Socket.IO
- AI API Integration
- Responsive UI Development
- Deployment Preparation

---

# 🤝 Contributing

Contributions, suggestions, and improvements are always welcome.

Fork the repository and submit a Pull Request.

