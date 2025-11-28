# Physics Exam Platform - Deployment & Setup Guide

## 1. Prerequisites
- **Node.js** (v18 or higher)
- **Scilab** (Installed on the machine where code will be executed, e.g., student's laptop)
- **Supabase Account** (For database and authentication)

## 2. Environment Setup

### Server (`/server/.env`)
```env
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
AGENT_SECRET_KEY=secret_key_for_executor
```

### Client (`/client/.env`)
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3000 (or your hosted server URL)
```

### Executor (`/executor/.env`)
```env
BACKEND_URL=http://localhost:3000 (or your hosted server URL)
AGENT_SECRET_KEY=secret_key_for_executor
```

## 3. Installation
Run the following command in the root directory to install dependencies for all services:
```bash
npm install
cd server && npm install
cd ../client && npm install
cd ../executor && npm install
```

## 4. Database Setup
1. Go to your Supabase Dashboard -> SQL Editor.
2. Copy the content of `database/01_initial_schema.sql` and run it.
3. (Optional) Run the seed script to create test users:
   ```bash
   node seed_users.js
   ```
   *Note: Ensure `server/.env` has the `SUPABASE_SERVICE_ROLE_KEY` set correctly before running this.*

## 5. Running Locally
To start all services (Server, Client, Executor) simultaneously:
```bash
npm start
```
- **Client**: http://localhost:5173
- **Server**: http://localhost:3000
- **Executor**: Background process

## 6. Hosting

### Frontend (Client)
- Deploy the `/client` folder to **Vercel** or **Netlify**.
- Set the Build Command to `npm run build`.
- Set the Output Directory to `dist`.
- Add Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`) in the hosting dashboard.

### Backend (Server)
- Deploy the `/server` folder to **Render**, **Heroku**, or **Railway**.
- Set the Start Command to `npm start`.
- Add Environment Variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `AGENT_SECRET_KEY`).

### Executor (Student's Laptop)
The executor is designed to run locally on the student's machine to access their Scilab installation.
1. Distribute the `/executor` folder to students (or package it as an executable).
2. Students must have **Scilab** installed and `scilab-cli` available in their system PATH.
3. Students run:
   ```bash
   npm install
   node index.js
   ```
   *Note: You might want to wrap this in a simple double-click script for ease of use.*

## 7. Verification
1. Log in as Admin (`admin@example.com` / `password123` if seeded).
2. Create an Exam.
3. Log in as Student (`student@example.com` / `password123` if seeded).
4. Start the Exam.
5. Enter Scilab code and click "Run".
6. Verify that the Executor log shows the job being picked up and executed.
