# Physics Exam Platform - Master Prompt & Requirements

## 1. Project Overview
Develop a secure, robust, and user-friendly examination platform for the Physics Department. The platform will allow students to take exams consisting of Scilab coding questions and standard quiz questions (MCQ, True/False, Short Answer).

## 2. Core Architecture
- **Frontend**: React (Vite) with a premium, responsive UI (Dark mode, Glassmorphism).
- **Backend**: Node.js + Express.
- **Database**: Supabase (PostgreSQL) for data persistence and Realtime features.
- **Authentication**: Supabase Auth (Email/Password) with Role-based Access Control (Admin vs. Student).
- **Executor Service**: A local Node.js service running on the student's machine that executes Scilab code via `scilab-cli` (replacing the original Docker approach).

## 3. Key Features

### A. Student Interface
1.  **Dashboard**:
    -   View available exams.
    -   Logout functionality.
2.  **Exam Interface**:
    -   **Fullscreen Mode**: Enforced during the exam.
    -   **Quiz Section**: Supports MCQ, True/False, and Short Answer questions.
    -   **Coding Workspace**:
        -   Monaco Editor for writing Scilab code.
        -   **Execution Limits**: Students are limited to **5 execution attempts** per coding question.
        -   Real-time output display.
3.  **Security & Proctoring**:
    -   **Tab Switch Detection**: If a student switches tabs or exits fullscreen, they are **automatically blocked** from the exam.
    -   **Blocked Screen**: A blocked student sees a warning screen and cannot continue until unblocked by an Admin.

### B. Admin Dashboard
1.  **Exam Management**:
    -   Create new exams (Title, Description).
    -   **Toggle Status**: Start or Stop exams (Active/Inactive).
    -   List existing exams with status indicators.
2.  **Question Management**:
    -   Add Coding Questions (Title, Description, Initial Code, Solution, Test Cases, Points).
    -   Add Quiz Questions (Type, Question, Options, Correct Answer, Points).
3.  **Student Monitoring**:
    -   **View Blocked Users**: See which students are blocked and the reason (e.g., "Tab switching detected").
    -   **Unblock Users**: Ability to unblock a student to allow them to resume the exam.
4.  **Results**:
    -   View submissions for both coding and quiz sections.

## 4. Database Schema (Supabase)
-   **users**: Managed by Supabase Auth.
-   **exams**: `id`, `title`, `description`, `is_active`, `created_at`.
-   **coding_questions**: `id`, `exam_id`, `title`, `description`, `initial_code`, `test_cases`, `points`.
-   **quiz_questions**: `id`, `exam_id`, `type`, `question`, `options`, `correct_answer`, `points`.
-   **submissions**: `id`, `exam_id`, `question_id`, `user_id`, `code`, `output`, `status`, `score`, `created_at`.
-   **quiz_submissions**: `id`, `exam_id`, `question_id`, `user_id`, `answer`, `is_correct`, `score`.
-   **blocked_students**: `id`, `exam_id`, `user_id`, `reason`, `created_at`.

## 5. Technical Requirements
-   **Local Execution**: The executor service must run locally on the client machine to access `scilab-cli`.
-   **Security**: API endpoints must be protected via JWT (Supabase Auth).
-   **Reliability**: The system should handle network fluctuations and execution timeouts (10s limit for code).

## 6. Deployment
-   **Frontend**: Hosted on Vercel/Netlify.
-   **Backend**: Hosted on Render/Railway.
-   **Executor**: Distributed to students as a local package.
