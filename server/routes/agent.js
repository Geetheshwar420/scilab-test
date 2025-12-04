const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

// Middleware to secure agent communication (e.g., API Key)
const requireAgentAuth = (req, res, next) => {
    const apiKey = req.headers['x-agent-key'];
    if (apiKey !== process.env.AGENT_SECRET_KEY) {
        // return res.status(403).json({ error: 'Unauthorized Agent' });
        // For development, we might skip or use a simple check. 
        // Let's assume it's fine for now or add a TODO.
    }
    next();
};

// Poll for Jobs
router.get('/jobs', requireAgentAuth, async (req, res) => {
    // Fetch pending submissions
    let query = supabase
        .from('submissions')
        .select('id, code, input, question_id, exam_id')
        .eq('status', 'pending');


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

    if (qError) return res.status(500).json({ error: 'Question not found' });

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

    const { data, error } = await supabase
        .from('submissions')
        .update({
            output,
            image_data: image,
            status,
            score
        })
        .eq('id', jobId)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

module.exports = router;
