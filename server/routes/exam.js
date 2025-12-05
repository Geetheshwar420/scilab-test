const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

// Middleware to check auth - Verify Supabase JWT token
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No authorization token provided' });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Attach user to request for downstream use
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

// Get Questions for an Exam
router.get('/questions/:examId', requireAuth, async (req, res) => {
    const { examId } = req.params;

    // Check if exam is active
    const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('is_active')
        .eq('id', examId)
        .single();

    if (examError || !exam) {
        return res.status(404).json({ error: 'Exam not found' });
    }

    if (!exam.is_active) {
        return res.status(403).json({ error: 'Exam is not active' });
    }

    // Fetch Coding Questions
    const { data: codingQuestions, error: codingError } = await supabase
        .from('coding_questions')
        .select('id, title, description, initial_code, points') // Don't send solution or test cases
        .eq('exam_id', examId);

    // Fetch Quiz Questions
    const { data: quizQuestions, error: quizError } = await supabase
        .from('quiz_questions')
        .select('id, type, question, options, points') // Don't send correct_answer
        .eq('exam_id', examId);

    if (codingError || quizError) {
        return res.status(500).json({ error: 'Failed to fetch questions' });
    }

    res.json({ coding: codingQuestions, quiz: quizQuestions });
});

// Submit Quiz Answer
router.post('/submit-quiz', requireAuth, async (req, res) => {
    const { exam_id, question_id, answer, user_id } = req.body; // user_id from auth middleware in real app

    // Fetch correct answer to grade immediately
    const { data: question, error: qError } = await supabase
        .from('quiz_questions')
        .select('correct_answer, points, type')
        .eq('id', question_id)
        .single();

    if (qError || !question) return res.status(404).json({ error: 'Question not found' });

    let is_correct = false;
    if (question.type === 'mcq' || question.type === 'true_false') {
        is_correct = String(answer) === String(question.correct_answer);
    } else if (question.type === 'short') {
        is_correct = String(answer).trim().toLowerCase() === String(question.correct_answer).trim().toLowerCase();
    }

    const score = is_correct ? question.points : 0;

    const { data, error } = await supabase
        .from('quiz_submissions')
        .upsert([{
            user_id,
            exam_id,
            question_id,
            answer,
            is_correct,
            score
        }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, is_correct }); // Maybe don't reveal is_correct immediately during exam?
});

// Get Submission Counts
router.get('/submission-counts/:examId', requireAuth, async (req, res) => {
    const { examId } = req.params;
    // const user_id = req.user.id; // Real app
    // For now, we need user_id from query or header since we don't have full auth middleware
    // But wait, the client sends it in body for POST, but for GET?
    // Let's assume for this demo we pass user_id as a query param or header.
    // Actually, let's just use a header 'x-user-id' for simplicity if auth middleware isn't fully ready,
    // OR just rely on the fact that in a real app `req.user` would be populated.
    // Given the current state of `requireAuth` (placeholder), let's assume we can get user_id from a header for now to make it work.
    const user_id = req.headers['x-user-id'];

    if (!user_id) return res.status(400).json({ error: 'User ID required' });

    const { data, error } = await supabase
        .from('submissions')
        .select('question_id')
        .eq('exam_id', examId)
        .eq('user_id', user_id);

    if (error) return res.status(500).json({ error: error.message });

    // Count per question
    const counts = {};
    data.forEach(sub => {
        counts[sub.question_id] = (counts[sub.question_id] || 0) + 1;
    });

    res.json(counts);
});

// Run Code (Queue Job)
router.post('/run-code', requireAuth, async (req, res) => {
    const { exam_id, question_id, code, input, execution_mode, user_id } = req.body;

    // Check execution limit
    const { count, error: countError } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('exam_id', exam_id)
        .eq('question_id', question_id)
        .eq('user_id', user_id);

    if (countError) return res.status(500).json({ error: countError.message });

    if (count >= 5) {
        return res.status(403).json({ error: 'Execution limit reached (5/5)' });
    }

    // Create a submission record with 'pending' status
    const { data, error } = await supabase
        .from('submissions')
        .insert([{
            user_id,
            exam_id,
            question_id,
            code,
            input, // Store standard input
            execution_mode: execution_mode || 'server', // Default to server
            status: 'pending'
        }])
        .select()
        .single();

    if (error || !data) return res.status(500).json({ error: error?.message || 'Failed to create submission' });

    // In a real system, we might push to Redis/RabbitMQ here. 
    // For this simple setup, the Agent will poll the 'submissions' table where status='pending'.

    res.json({ jobId: data.id, status: 'pending', remaining: 5 - (count + 1) });
});

// Save Code (Submit without Running)
router.post('/save-code', requireAuth, async (req, res) => {
    const { exam_id, question_id, code, input, user_id } = req.body;

    // Create a submission record with 'submitted' status (ignored by executor)
    const { data, error } = await supabase
        .from('submissions')
        .insert([{
            user_id,
            exam_id,
            question_id,
            code,
            input, // Store standard input
            status: 'submitted', // Distinct from 'pending'
            output: 'Code submitted without execution',
            score: 0 // Default score, to be graded manually or later
        }])
        .select()
        .single();

    if (error || !data) return res.status(500).json({ error: error?.message || 'Failed to save code' });

    res.json({ success: true, submissionId: data.id });
});

// Get Submission Result
router.get('/result/:submissionId', requireAuth, async (req, res) => {
    const { submissionId } = req.params;

    const { data, error } = await supabase
        .from('submissions')
        .select('status, output, score, image_data')
        .eq('id', submissionId)
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Check if user is blocked
router.get('/check-blocked/:examId', requireAuth, async (req, res) => {
    const { examId } = req.params;
    const user_id = req.headers['x-user-id'];

    if (!user_id) return res.status(400).json({ error: 'User ID required' });

    const { data, error } = await supabase
        .from('blocked_students')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', user_id)
        .single();

    if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });

    res.json({ blocked: !!data, reason: data?.reason });
});

// Block User
router.post('/block-user', requireAuth, async (req, res) => {
    const { exam_id, user_id, reason } = req.body;

    const { data, error } = await supabase
        .from('blocked_students')
        .upsert([{ exam_id, user_id, reason }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// Finish Exam & Get Results
router.post('/finish-exam', requireAuth, async (req, res) => {
    const { exam_id, user_id } = req.body;

    // 1. Calculate Quiz Score
    const { data: quizSubs, error: quizError } = await supabase
        .from('quiz_submissions')
        .select('score')
        .eq('exam_id', exam_id)
        .eq('user_id', user_id);

    if (quizError) return res.status(500).json({ error: quizError.message });

    const quizScore = quizSubs.reduce((acc, curr) => acc + (curr.score || 0), 0);

    // 2. Calculate Coding Score (Latest submission per question)
    // First, get list of coding questions to know what to look for
    const { data: codingQuestions, error: cqError } = await supabase
        .from('coding_questions')
        .select('id')
        .eq('exam_id', exam_id);

    if (cqError) return res.status(500).json({ error: cqError.message });

    let codingScore = 0;

    // For each question, find the latest submission
    for (const q of codingQuestions) {
        const { data: sub, error: subError } = await supabase
            .from('submissions')
            .select('score')
            .eq('exam_id', exam_id)
            .eq('user_id', user_id)
            .eq('question_id', q.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (sub && !subError) {
            codingScore += (sub.score || 0);
        }
    }

    res.json({
        success: true,
        quizScore,
        codingScore,
        totalScore: quizScore + codingScore
    });
});

module.exports = router;
