-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Exams Table
create table exams (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  is_active boolean default false,
  created_at timestamp with time zone default now()
);

-- Coding Questions Table
create table coding_questions (
  id uuid default uuid_generate_v4() primary key,
  exam_id uuid references exams(id) on delete cascade,
  title text not null,
  description text not null,
  initial_code text,
  solution_code text,
  test_cases jsonb, -- Array of {input, output}
  points integer default 10,
  created_at timestamp with time zone default now()
);

-- Quiz Questions Table
create table quiz_questions (
  id uuid default uuid_generate_v4() primary key,
  exam_id uuid references exams(id) on delete cascade,
  type text check (type in ('mcq', 'true_false', 'short')),
  question text not null,
  options jsonb, -- Array of strings for MCQ
  correct_answer text not null, -- Store as text, parse based on type
  points integer default 1,
  created_at timestamp with time zone default now()
);

-- Submissions Table (for Coding)
create table submissions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null, -- Supabase Auth User ID
  exam_id uuid references exams(id) on delete cascade,
  question_id uuid references coding_questions(id) on delete cascade,
  code text not null,
  status text default 'pending', -- pending, running, completed, failed
  output text,
  score integer,
  created_at timestamp with time zone default now()
);

-- Quiz Submissions Table
create table quiz_submissions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null,
  exam_id uuid references exams(id) on delete cascade,
  question_id uuid references quiz_questions(id) on delete cascade,
  answer text not null,
  is_correct boolean,
  score integer,
  created_at timestamp with time zone default now()
);

-- Blocked Users Table
create table blocks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null unique,
  reason text,
  created_at timestamp with time zone default now()
);

-- Audit Logs Table
create table audit_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid,
  action text not null,
  details jsonb,
  ip_address text,
  created_at timestamp with time zone default now()
);

-- RLS Policies (Basic)
alter table exams enable row level security;
alter table coding_questions enable row level security;
alter table quiz_questions enable row level security;
alter table submissions enable row level security;
alter table quiz_submissions enable row level security;
alter table blocks enable row level security;
alter table audit_logs enable row level security;

-- Allow read access to exams for authenticated users
create policy "Exams are viewable by everyone" on exams for select using (true);

-- Allow read access to questions if exam is active (logic to be refined)
create policy "Questions viewable if exam active" on coding_questions for select using (true);
create policy "Quiz questions viewable if exam active" on quiz_questions for select using (true);

-- Users can insert their own submissions
create policy "Users can insert submissions" on submissions for insert with check (auth.uid() = user_id);
create policy "Users can view own submissions" on submissions for select using (auth.uid() = user_id);

create policy "Users can insert quiz submissions" on quiz_submissions for insert with check (auth.uid() = user_id);
create policy "Users can view own quiz submissions" on quiz_submissions for select using (auth.uid() = user_id);

-- Admin policies would need to be added (using a role or specific user IDs)
