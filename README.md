# Physics Dept Examination Platform

A secure, full-stack examination platform with Scilab coding capabilities.

## Architecture
- **Frontend**: React (Vite)
- **Backend**: Node.js + Express
- **Database**: Supabase
- **Executor**: Node.js + Docker (Local)

## Setup Instructions

### 1. Database (Supabase)
1. Create a new Supabase project.
2. Go to the SQL Editor and run the script in `database/01_initial_schema.sql`.
3. Get your `SUPABASE_URL` and `SUPABASE_ANON_KEY` from Project Settings > API.
4. Get your `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!).

### 2. Backend (Server)
1. Navigate to `/server`.
2. Copy `.env.example` to `.env` and fill in your Supabase credentials.
3. Run `npm install`.
4. Start the server: `npm start` (or `npm run dev`).

### 3. Frontend (Client)
1. Navigate to `/client`.
2. Copy `.env.example` to `.env` and fill in your Supabase credentials.
3. Run `npm install`.
4. Start the client: `npm run dev`.

### 4. Executor Service (Local)
1. Install Docker Desktop and ensure it's running.
2. Navigate to `/executor`.
3. Build the Scilab image: `docker build -t scilab-executor .`
4. Copy `.env.example` to `.env` and configure the Backend URL.
5. Run `npm install`.
6. Start the executor: `node index.js`.

## Usage
1. **Admin**: Go to `/admin` to create exams and add questions.
2. **Student**: Login, select an exam from the dashboard, and start.
3. **Coding**: Write Scilab code in the editor and click "Run Code". The executor will process it locally.

## Security
- Fullscreen is enforced during exams.
- Tab switching is logged.
- Code execution is sandboxed in Docker with no network access.
