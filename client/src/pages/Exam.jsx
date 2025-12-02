import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import CodingWorkspace from '../components/CodingWorkspace';
import QuizSection from '../components/QuizSection';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Exam() {
    const { examId } = useParams();
    const [questions, setQuestions] = useState({ coding: [], quiz: [] });
    const [currentCodingQ] = useState(0); // TODO: Add setter when multiple questions supported
    const [output, setOutput] = useState('');
    const [imageData, setImageData] = useState(null);
    const [status, setStatus] = useState('idle');
    const [executionCounts, setExecutionCounts] = useState({});
    const [error, setError] = useState(null);
    const [isBlocked, setIsBlocked] = useState(false);

    const fetchQuestions = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            // Check if blocked first
            if (session?.user?.id) {
                const blockRes = await fetch(`${API_URL}/exam/check-blocked/${examId}`, {
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`,
                        'x-user-id': session.user.id
                    }
                });
                if (blockRes.ok) {
                    const blockData = await blockRes.json();
                    if (blockData.blocked) {
                        setIsBlocked(true);
                        return;
                    }
                }
            }

            // Check cache first
            const cachedData = localStorage.getItem(`exam_questions_${examId}`);
            if (cachedData) {
                setQuestions(JSON.parse(cachedData));
            }

            const res = await fetch(`${API_URL}/exam/questions/${examId}`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });

            if (!res.ok) {
                if (res.status === 403) throw new Error('Exam is not active yet');
                // If we have cache, don't throw error, just warn? 
                // But if we have cache, we already set it.
                if (!cachedData) throw new Error('Failed to load exam');
            } else {
                const data = await res.json();
                if (data.coding) {
                    setQuestions(data);
                    localStorage.setItem(`exam_questions_${examId}`, JSON.stringify(data));
                }
            }
            setError(null);

            // Fetch execution counts
            if (session?.user?.id) {
                const countRes = await fetch(`${API_URL}/exam/submission-counts/${examId}`, {
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`,
                        'x-user-id': session.user.id
                    }
                });
                if (countRes.ok) {
                    const counts = await countRes.json();
                    setExecutionCounts(counts);
                }
            }
        } catch (err) {
            setError(err.message);
        }
    }, [examId]);

    useEffect(() => {
        fetchQuestions();

        // Enforce Fullscreen
        document.documentElement.requestFullscreen().catch(e => console.log(e));

        // Prevent tab switching
        const handleVisibilityChange = async () => {
            if (document.hidden && !isBlocked) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.id) {
                    await fetch(`${API_URL}/exam/block-user`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session?.access_token}`
                        },
                        body: JSON.stringify({
                            exam_id: examId,
                            user_id: session.user.id,
                            reason: 'Tab switching detected'
                        })
                    });
                    setIsBlocked(true);
                }
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [examId, isBlocked, fetchQuestions]);

    const handleRunCode = async (code) => {
        const currentQId = questions.coding[currentCodingQ]?.id;
        const currentCount = executionCounts[currentQId] || 0;

        if (currentCount >= 5) {
            alert("Execution limit reached (5/5)");
            return;
        }

        setStatus('running');
        setOutput('Job queued...');

        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_URL}/exam/run-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': ... 
            },
            body: JSON.stringify({
                exam_id: examId,
                question_id: currentQId,
                code,
                user_id: session?.user?.id
            })
        });

        if (!res.ok) {
            const err = await res.json();
            setStatus('error');
            setOutput(err.error);
            return;
        }

        const { jobId } = await res.json();

        // Update count locally
        setExecutionCounts(prev => ({
            ...prev,
            [currentQId]: (prev[currentQId] || 0) + 1
        }));

        // Poll for result
        const interval = setInterval(async () => {
            const res = await fetch(`${API_URL}/exam/result/${jobId}`);
            const data = await res.json();
            if (data.status !== 'pending' && data.status !== 'running') {
                clearInterval(interval);
                setStatus(data.status);
                setOutput(data.output);
                setImageData(data.image_data);
            }
        }, 4000);
    };

    const handleQuizAnswer = async (questionId, answer) => {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`${API_URL}/exam/submit-quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                exam_id: examId,
                question_id: questionId,
                answer,
                user_id: session?.user?.id
            })
        });
    };

    if (isBlocked) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#fee2e2', color: '#991b1b' }}>
                <h1>You have been blocked!</h1>
                <p>Tab switching or leaving the exam screen is not allowed.</p>
                <p>Please contact the administrator to unblock you.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <h2>{error}</h2>
                <button onClick={fetchQuestions} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '1.2em', cursor: 'pointer' }}>Refresh Status</button>
            </div>
        );
    }

    if (!questions.coding.length && !questions.quiz.length) return <div>Loading Exam...</div>;

    const currentQId = questions.coding[currentCodingQ]?.id;
    const executionsUsed = executionCounts[currentQId] || 0;

    return (
        <div style={{ display: 'flex', height: '100vh' }}>
            <div style={{ flex: 1, borderRight: '1px solid #ccc' }}>
                <QuizSection questions={questions.quiz} onAnswer={handleQuizAnswer} />
            </div>
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
                <div style={{ padding: '15px 20px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <div>
                        <h2 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', color: 'var(--color-text)' }}>
                            {questions.coding[currentCodingQ]?.title || `Coding Question ${currentCodingQ + 1}`}
                        </h2>
                        <span style={{ fontSize: '0.9em', color: executionsUsed >= 5 ? 'var(--color-error)' : 'var(--color-text-secondary)', fontWeight: 'bold' }}>
                            Executions: {executionsUsed} / 5
                        </span>
                    </div>
                    {/* Spacer to avoid overlap with fixed theme toggle */}
                    <div style={{ width: '100px' }}></div>
                </div>

                <div style={{ padding: '15px 20px', background: 'var(--color-background)', borderBottom: '1px solid var(--color-border)', maxHeight: '150px', overflowY: 'auto', flexShrink: 0 }}>
                    <p style={{ margin: 0, color: 'var(--color-text)', lineHeight: '1.6' }}>
                        {questions.coding[currentCodingQ]?.description}
                    </p>
                </div>

                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <CodingWorkspace
                        initialCode={questions.coding[currentCodingQ]?.initial_code}
                        onRun={handleRunCode}
                        output={output}
                        status={status}
                        imageData={imageData}
                        disabled={executionsUsed >= 5}
                    />
                </div>
            </div>
        </div>
    );
}
