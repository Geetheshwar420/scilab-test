const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

// Middleware to check if user is admin - Verify role from JWT
const isAdmin = async (req, res, next) => {
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

        // Check if user has admin role (stored in user metadata)
        const isAdminUser = user.email === 'geethu' || user.user_metadata?.role === 'admin';

        if (!isAdminUser) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Authentication failed' });
    }
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
    const { exam_id, title, description, initial_code, expected_output, test_cases, points } = req.body;

    const { data, error } = await supabase
        .from('coding_questions')
        .insert([{ exam_id, title, description, initial_code, expected_output, test_cases, points }])
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
    const { title, description, initial_code, expected_output, test_cases, points } = req.body;

    const { data, error } = await supabase
        .from('coding_questions')
        .update({ title, description, initial_code, expected_output, test_cases, points })
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
        .select('*')
        .eq('exam_id', examId);

    if (error) return res.status(500).json({ error: error.message });

    // Fetch all users to map IDs to Emails
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    const userMap = {};
    if (users) {
        users.forEach(u => {
            userMap[u.id] = u.email;
        });
    }

    const blockedWithEmails = data.map(u => ({
        ...u,
        email: userMap[u.user_id] || 'Unknown'
    }));

    res.json(blockedWithEmails);
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

    // Fetch all users to map IDs to Emails
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
        console.error('Error fetching users:', usersError);
        // Continue without emails if user fetch fails
    }

    const userMap = {};
    if (users) {
        users.forEach(u => {
            userMap[u.id] = u.email;
        });
    }

    // Attach emails to submissions
    const codingWithEmails = codingSubs.map(sub => ({
        ...sub,
        email: userMap[sub.user_id] || 'Unknown'
    }));

    const quizWithEmails = quizSubs.map(sub => ({
        ...sub,
        email: userMap[sub.user_id] || 'Unknown'
    }));

    res.json({ coding: codingWithEmails, quiz: quizWithEmails });
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

// Reset Exam Attempt
router.post('/reset-exam', isAdmin, async (req, res) => {
    const { exam_id, user_id } = req.body;

    // Delete from submissions (Coding)
    const { error: sError } = await supabase
        .from('submissions')
        .delete()
        .eq('exam_id', exam_id)
        .eq('user_id', user_id);

    if (sError) {
        console.error('Error deleting coding submissions:', sError);
        return res.status(500).json({ error: sError.message });
    }

    // Delete from quiz_submissions
    const { error: qError } = await supabase
        .from('quiz_submissions')
        .delete()
        .eq('exam_id', exam_id)
        .eq('user_id', user_id);

    if (qError) {
        console.error('Error deleting quiz submissions:', qError);
        return res.status(500).json({ error: qError.message });
    }

    res.json({ success: true });
});



module.exports = router;
