# GoTravelX - Flight Tracking System

## Overview

**GoTravelX** is a modern **Flight Tracking System** tailored for vendors and cleaners to track flights in real time and deliver services efficiently. This upgraded version now uses **AWS DynamoDB** for scalable and low-latency data access.


- **Check the log's here on camino blockchain**

## 🧰 Tech Stack

- **Backend**: Node.js (Express.js)
- **Database**: AWS DynamoDB
- **Port**: `3000`

## Implemented  Smart Contract Link
```bash
https://columbus.caminoscan.com/address/0x8b35578f223B76930De24a37dFAdc7A24a73dd23?tab=contract
```

## ✈️ Core Features

- Real-time flight status monitoring
- Blockchain-backed flight history
- Scalable, serverless DB with DynamoDB

## 🔧 Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org/)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
- AWS IAM user credentials (Access Key & Secret)
- [NoSQL Workbench for DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/workbench.settingup.html) (for GUI exploration)

### Setting Up Locally

```bash
# 1. Clone the project
git clone https://github.com/gotravelx/go-travelx-backend
cd go-travelx-backend

# 2. Install dependencies
npm install

# 3. Configure your environment
touch .env
```

Add the following to `.env`:

```env
PORT=3000
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1  # example: change as needed
```

Start the backend:

```bash
npm start
```

## 🧪 API Testing

Use Postman or your browser to hit:

```
http://localhost:3000
```

## 🧑‍💻 Setting up NoSQL Workbench for DynamoDB

> Helpful for visualizing and modeling tables.

### 1. Install Workbench
Download: [NoSQL Workbench Download](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/workbench.settingup.html)

### 2. Connect your AWS account

- Open NoSQL Workbench
- Go to **“Operations Builder” → “Add Connection”**
- Fill in:

  | Field       | Value                    |
  |-------------|--------------------------|
  | Access Key  | From your `.env`         |
  | Secret Key  | From your `.env`         |
  | Region      | `ap-south-1` (or yours)  |
  | Session Token | (Optional if using temp creds) |

### 3. Visualize Tables

You can:

- Design your data model in the **Data modeler**
- Run queries in **Operation builder**
- View live data in **Workbench viewer**

## 👥 Contributing

Pull requests welcome! Please follow the code style and naming conventions used in this repo.

## 📝 License

MIT License — use freely for commercial or personal use.

---

Developed by **GoTravelX** 🚀