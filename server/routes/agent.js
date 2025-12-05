const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

// Middleware to secure agent communication (e.g., API Key)
const requireAgentAuth = (req, res, next) => {
    const apiKey = req.headers['x-agent-key'];
    if (apiKey !== process.env.AGENT_SECRET_KEY) {
        // TODO: Enforce stricter auth in production
    }
    next();
};

// Poll for Jobs
router.get('/jobs', requireAgentAuth, async (req, res) => {
    const executionMode = req.headers['x-execution-mode'] || 'server';
    const filterUserId = req.headers['x-filter-user-id'];

    let query = supabase
        .from('submissions')
        .select('id, code, input, question_id, exam_id')
        .eq('status', 'pending')
        .eq('execution_mode', executionMode);

    if (filterUserId) {
        query = query.eq('user_id', filterUserId);
    }

    const { data, error } = await query;

    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.json({ job: null });

    const job = data[0];

    // Mark as running
    await supabase
        .from('submissions')
        .update({ status: 'running' })
        .eq('id', job.id);

    // Fetch test cases for the question
    const { data: question, error: qError } = await supabase
        .from('coding_questions')
        .select('test_cases, solution_code')
        .eq('id', job.question_id)
        .single();

    if (qError || !question) return res.status(404).json({ error: 'Question not found' });

    res.json({
        job: {
            ...job,
            test_cases: question.test_cases,
            solution_code: question.solution_code
        }
    });
});

// Submit Job Result
router.post('/job-result', requireAgentAuth, async (req, res) => {
    const { jobId, output, status, score, image } = req.body;

    // 1. Get submission to find question_id
    const { data: submission, error: subError } = await supabase
        .from('submissions')
        .select('question_id')
        .eq('id', jobId)
        .single();

    if (subError || !submission) return res.status(404).json({ error: 'Submission not found' });

    // 2. Get question points
    const { data: question, error: qError } = await supabase
        .from('coding_questions')
        .select('points')
        .eq('id', submission.question_id)
        .single();

    let finalScore = score || 0;

    // Simple Grading Logic: If execution completed successfully, award full points
    // TODO: Implement more sophisticated grading (e.g., output matching)
    if (status === 'completed' && question) {
        finalScore = question.points;
    }

    const { data, error } = await supabase
        .from('submissions')
        .update({
            output,
            image_data: image,
            status,
            score: finalScore
        })
        .eq('id', jobId)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

module.exports = router;
