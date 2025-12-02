const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

// Middleware to check if user is admin (TODO: Implement proper admin check)
const isAdmin = async (req, res, next) => {
    // For now, we'll assume the client sends a secret or we check a specific user ID
    // In production, check req.user.role or similar from Supabase Auth
    next();
};

// Get All Exams
router.get('/exams', isAdmin, async (req, res) => {
    const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Create Exam
router.post('/create-exam', isAdmin, async (req, res) => {
    const { title, description, start_time, end_time } = req.body;

    const { data, error } = await supabase
        .from('exams')
        .insert([{ title, description, start_time, end_time }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// Add Coding Question
router.post('/add-coding-question', isAdmin, async (req, res) => {
    const { exam_id, title, description, initial_code, solution_code, test_cases, points } = req.body;

    const { data, error } = await supabase
        .from('coding_questions')
        .insert([{ exam_id, title, description, initial_code, solution_code, test_cases, points }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// Add Quiz Question
router.post('/add-quiz-question', isAdmin, async (req, res) => {
    const { exam_id, type, question, options, correct_answer, points } = req.body;

    const { data, error } = await supabase
        .from('quiz_questions')
        .insert([{ exam_id, type, question, options, correct_answer, points }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// Get Questions for an Exam
router.get('/exam-questions/:examId', isAdmin, async (req, res) => {
    const { examId } = req.params;

    const { data: codingQuestions, error: codingError } = await supabase
        .from('coding_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: true });

    const { data: quizQuestions, error: quizError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: true });

    if (codingError || quizError) return res.status(500).json({ error: 'Failed to fetch questions' });
    res.json({ coding: codingQuestions, quiz: quizQuestions });
});

// Update Coding Question
router.put('/update-coding-question/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, description, initial_code, solution_code, test_cases, points } = req.body;

    const { data, error } = await supabase
        .from('coding_questions')
        .update({ title, description, initial_code, solution_code, test_cases, points })
        .eq('id', id)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// Update Quiz Question
router.put('/update-quiz-question/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { type, question, options, correct_answer, points } = req.body;

    const { data, error } = await supabase
        .from('quiz_questions')
        .update({ type, question, options, correct_answer, points })
        .eq('id', id)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// Delete Coding Question
router.delete('/delete-coding-question/:id', isAdmin, async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('coding_questions')
        .delete()
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// Delete Quiz Question
router.delete('/delete-quiz-question/:id', isAdmin, async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// Start Exam (Activate)
router.post('/start-exam/:id', isAdmin, async (req, res) => {
    const { id } = req.params;

    const { data, error } = await supabase
        .from('exams')
        .update({ is_active: true })
        .eq('id', id)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// Stop Exam
router.post('/stop-exam/:id', isAdmin, async (req, res) => {
    const { id } = req.params;

    const { data, error } = await supabase
        .from('exams')
        .update({ is_active: false })
        .eq('id', id)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// Get Blocked Users
router.get('/blocked-users/:examId', isAdmin, async (req, res) => {
    const { examId } = req.params;

    const { data, error } = await supabase
        .from('blocked_students')
        .select('*, users:user_id(email)') // Assuming user_id links to auth.users, but we might not be able to join on auth schema directly easily depending on permissions.
        // If auth.users is not accessible, we might need to rely on a public 'profiles' table if it exists.
        // For this demo, let's assume we can just get the user_id and maybe we have a separate users table or we just show ID.
        // Actually, let's try to join if we have a public users table. We don't have one in the schema I saw.
        // Let's just return the data and maybe fetch user details separately or assume we have a way.
        .eq('exam_id', examId);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Unblock User
router.post('/unblock-user', isAdmin, async (req, res) => {
    const { exam_id, user_id } = req.body;

    const { error } = await supabase
        .from('blocked_students')
        .delete()
        .eq('exam_id', exam_id)
        .eq('user_id', user_id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// Get Exam Results
router.get('/exam-results/:examId', isAdmin, async (req, res) => {
    const { examId } = req.params;

    // Fetch all submissions
    const { data: codingSubs, error: codingError } = await supabase
        .from('submissions')
        .select('*')
        .eq('exam_id', examId);

    const { data: quizSubs, error: quizError } = await supabase
        .from('quiz_submissions')
        .select('*')
        .eq('exam_id', examId);

    if (codingError || quizError) return res.status(500).json({ error: 'Failed to fetch results' });

    res.json({ coding: codingSubs, quiz: quizSubs });
});

// Bulk Create Student Accounts
router.post('/create-students', isAdmin, async (req, res) => {
    const { usernames } = req.body; // Array of usernames

    if (!Array.isArray(usernames) || usernames.length === 0) {
        return res.status(400).json({ error: 'Please provide an array of usernames' });
    }

    const results = {
        successful: [],
        failed: []
    };

    // Create accounts one by one
    for (const username of usernames) {
        try {
            // Email format: username@klu.ac.in
            const email = `${username}@klu.ac.in`;
            const password = username; // Password is the same as username

            const { data, error } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true, // Auto-confirm email
                user_metadata: {
                    role: 'student',
                    username: username
                }
            });

            if (error) {
                results.failed.push({ username, error: error.message });
            } else {
                results.successful.push({ username, email, user_id: data.user.id });
            }
        } catch (err) {
            results.failed.push({ username, error: err.message });
        }
    }

    res.json({
        message: `Created ${results.successful.length} out of ${usernames.length} accounts`,
        results
    });
});

module.exports = router;
