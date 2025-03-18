# GoTravelX - Flight Tracking System for Vendors

## Overview

GoTravelX is a **Flight Tracking System** designed for vendors and cleaners to efficiently track flights and provide timely services. This system ensures that vendors can access real-time flight information and manage their tasks effectively.

## Tech Stack

- **Backend**: Node.js (Express.js)
- **Database**: MongoDB
- **Environment**: Docker (Optional)
- **Port**: `3000`

## Features

- Real-time flight information tracking
- Vendor and cleaner service management
- RESTful API for seamless integration
- Secure authentication and authorization
- Scalable and efficient database management

## Installation & Setup

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)

### Steps to Run Locally

1. Clone the repository:
   ```sh
   git clone https://github.com/gotravelx/go-travelx-backend
   cd go-travelx-backend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up environment variables: Create a `.env` file and add the following:
   ```env
   PORT=3000
   MONGO_URI=your_mongodb_connection_string
   ```
4. Start the server:
   ```sh
   npm start
   ```
5. Open your browser or use Postman to test the APIs at:
   ```
   http://localhost:3000
   ```

## Contributing

Feel free to submit issues or pull requests to improve GoTravelX. Contributions are welcome!

## License

This project is licensed under the MIT License.

---

Developed by **GoTravelx** 🚀
