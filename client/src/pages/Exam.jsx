import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CodingWorkspace from '../components/CodingWorkspace';
import QuizSection from '../components/QuizSection';
import { supabase } from '../lib/supabase';
import config from '../config';

const API_URL = config.apiUrl;

export default function Exam() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState({ coding: [], quiz: [] });
    // ... (rest of state)

    // ... (fetchQuestions)

    // ... (useEffect for visibility)

    // ... (handleRunCode, handleQuizAnswer, handleSubmitCode, handleDownloadExecutor)

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };


    const [currentCodingQ, setCurrentCodingQ] = useState(0);
    const [output, setOutput] = useState('');
    const [imageData, setImageData] = useState(null);
    const [status, setStatus] = useState('idle');
    const [executionCounts, setExecutionCounts] = useState({});
    const [error, setError] = useState(null);
    const [isBlocked, setIsBlocked] = useState(false);


    // State to hold code for each question
    const [codeState, setCodeState] = useState({});

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
                if (!cachedData) throw new Error('Failed to load exam');
            } else {
                const data = await res.json();
                if (data.coding) {
                    setQuestions(data);
                    localStorage.setItem(`exam_questions_${examId}`, JSON.stringify(data));

                    // Initialize code state
                    const initialCodeState = {};
                    data.coding.forEach((q, idx) => {
                        // Use saved code if available (not implemented in API yet but good practice) or initial_code
                        initialCodeState[idx] = q.initial_code || '';
                    });
                    setCodeState(initialCodeState);
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

        // Enforce Fullscreen (attempt, but don't crash if blocked)
        const enterFullscreen = async () => {
            try {
                await document.documentElement.requestFullscreen();
            } catch (e) {
                console.log("Fullscreen blocked:", e);
            }
        };
        enterFullscreen();

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

        // Disable Copy/Paste/Context Menu
        const preventCopyPaste = (e) => {
            e.preventDefault();
            alert("Copy/Paste is disabled during the exam!");
        };

        const preventContextMenu = (e) => {
            e.preventDefault();
        };

        document.addEventListener('copy', preventCopyPaste);
        document.addEventListener('cut', preventCopyPaste);
        document.addEventListener('paste', preventCopyPaste);
        document.addEventListener('contextmenu', preventContextMenu);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener('copy', preventCopyPaste);
            document.removeEventListener('cut', preventCopyPaste);
            document.removeEventListener('paste', preventCopyPaste);
            document.removeEventListener('contextmenu', preventContextMenu);
        };
    }, [examId, isBlocked, fetchQuestions]);

    const executeCode = async (code, input) => {
        const currentQId = questions.coding[currentCodingQ]?.id;
        const currentCount = executionCounts[currentQId] || 0;

        if (currentCount >= 5) {
            alert("Execution limit reached (5/5). Code will be saved without execution.");
            return null;
        }

        setStatus('running');
        setOutput('Job queued...');

        // Update local code state
        setCodeState(prev => ({ ...prev, [currentCodingQ]: code }));

        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_URL}/exam/run-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
                exam_id: examId,
                question_id: currentQId,
                code,
                input, // Send standard input
                execution_mode: 'server', // Hardcoded to server
                user_id: session?.user?.id
            })
        });

        if (!res.ok) {
            const err = await res.json();
            setStatus('error');
            setOutput(err.error);
            return null;
        }

        const { jobId } = await res.json();

        // Update count locally
        setExecutionCounts(prev => ({
            ...prev,
            [currentQId]: (prev[currentQId] || 0) + 1
        }));

        return new Promise((resolve) => {
            const interval = setInterval(async () => {
                const res = await fetch(`${API_URL}/exam/result/${jobId}`, {
                    headers: { 'Authorization': `Bearer ${session?.access_token}` }
                });
                const data = await res.json();

                if (data.status !== 'pending' && data.status !== 'running') {
                    clearInterval(interval);
                    setStatus(data.status);
                    setOutput(data.output);
                    setImageData(data.image_data);
                    resolve(data);
                }
            }, 4000);
        });
    };

    const handleRunCode = async (code, input) => {
        await executeCode(code, input);
    };

    const handleQuizAnswer = async (questionId, answer) => {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`${API_URL}/exam/submit-quiz`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
                exam_id: examId,
                question_id: questionId,
                answer,
                user_id: session?.user?.id
            })
        });
    };

    const [activeTab, setActiveTab] = useState('coding');
    const [modalConfig, setModalConfig] = useState({ show: false, message: '', onConfirm: null });

    const showConfirm = (message, onConfirm) => {
        setModalConfig({ show: true, message, onConfirm });
    };

    const closeConfirm = () => {
        setModalConfig({ show: false, message: '', onConfirm: null });
    };

    const handleSubmitCode = async (code, input) => {
        if (!questions.coding || !questions.coding.length) return;

        const currentQId = questions.coding[currentCodingQ]?.id;
        const { data: { session } } = await supabase.auth.getSession();

        // Update local code state
        setCodeState(prev => ({ ...prev, [currentCodingQ]: code }));

        // Show immediate feedback in terminal
        setOutput(prev => "Submitting code...\nExecuting test run...\n\n" + (prev || ''));

        // 1. Try to execute code first
        const executionResult = await executeCode(code, input);

        // 2. Save as submitted (passing the execution result)
        try {
            const res = await fetch(`${API_URL}/exam/save-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    exam_id: examId,
                    question_id: currentQId,
                    code,
                    input,
                    user_id: session?.user?.id,
                    score: executionResult?.score, // Pass the score from execution
                    output: executionResult?.output // Pass the output from execution
                })
            });

            if (res.ok) {
                // Append success message to terminal
                setOutput(prev => (prev || '') + "\n\n✅ Code submitted successfully!");

                // Auto-navigate to next question or finish
                if (currentCodingQ < questions.coding.length - 1) {
                    showConfirm("Code executed and submitted successfully! Move to next question?", () => {
                        setCurrentCodingQ(prev => prev + 1);
                        setOutput(''); // Clear output for next question
                        closeConfirm();
                    });
                } else {
                    showConfirm("Code executed and submitted successfully! This was the last question. Do you want to finish the exam?", () => {
                        handleFinalSubmit();
                        closeConfirm();
                    });
                }
            } else {
                setOutput(prev => (prev || '') + "\n\n❌ Failed to submit code.");
                alert("Failed to save code. Please try again.");
            }
        } catch (error) {
            console.error("Error saving code:", error);
            setOutput(prev => (prev || '') + "\n\n❌ Error submitting code.");
            alert("An error occurred while saving code.");
        }
    };

    const [examResult, setExamResult] = useState(null);

    const handleFinalSubmit = async () => {
        // If called directly (not from modal callback), show confirmation
        if (!modalConfig.show) {
            showConfirm("Are you sure you want to finish the exam? You cannot go back.", () => {
                handleFinalSubmit(); // Call again, but this time logic will proceed? No, logic needs to be separate.
                // Actually, let's just implement the logic here directly or separate it.
                // To avoid recursion issues with state, let's just define the logic function.
                submitExamLogic();
                closeConfirm();
            });
            return;
        }
        // If called from modal (which we don't really do directly, we pass a callback),
        // but let's just separate the logic.
    };

    const submitExamLogic = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        try {
            const res = await fetch(`${API_URL}/exam/finish-exam`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    exam_id: examId,
                    user_id: session?.user?.id
                })
            });

            if (res.ok) {
                const data = await res.json();
                setExamResult(data);
            } else {
                alert("Failed to submit exam. Please try again.");
            }
        } catch (e) {
            console.error(e);
            alert("An error occurred.");
        }
    };

    if (examResult) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-background)', color: 'var(--color-text)' }}>
                <div style={{ padding: '40px', borderRadius: '10px', background: 'var(--color-surface)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '500px', width: '90%' }}>
                    <h1 style={{ color: 'var(--color-primary)', marginBottom: '20px' }}>Exam Completed!</h1>
                    <div style={{ fontSize: '1.2rem', marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <p><strong>Quiz Score:</strong> {examResult.quizScore}</p>
                        <p><strong>Coding Score:</strong> {examResult.codingScore}</p>
                        <div style={{ borderTop: '1px solid var(--color-border)', margin: '10px 0' }}></div>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Total Score: {examResult.totalScore}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{ padding: '12px 30px', fontSize: '1.1em', cursor: 'pointer', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '5px', transition: 'transform 0.2s' }}
                    >
                        Logout
                    </button>
                </div>
            </div>
        );
    }

    if (isBlocked) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#fee2e2', color: '#991b1b' }}>
                <h1>You have been blocked!</h1>
                <p>Tab switching or leaving the exam screen is not allowed.</p>
                <p>Please contact the administrator to unblock you.</p>
                <button
                    onClick={handleLogout}
                    style={{ marginTop: '20px', padding: '10px 20px', fontSize: '1.2em', cursor: 'pointer', background: '#ef4444', color: 'white', border: 'none', borderRadius: '5px' }}
                >
                    Logout & Return to Login
                </button>
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
            {/* Custom Modal */}
            {modalConfig.show && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{
                        background: 'var(--color-surface)', padding: '30px', borderRadius: '10px',
                        maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--color-text)' }}>Confirmation</h3>
                        <p style={{ marginBottom: '30px', color: 'var(--color-text-secondary)' }}>{modalConfig.message}</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                            <button
                                onClick={closeConfirm}
                                style={{
                                    padding: '10px 20px', background: 'transparent', border: '1px solid var(--color-border)',
                                    color: 'var(--color-text)', borderRadius: '5px', cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={modalConfig.onConfirm}
                                style={{
                                    padding: '10px 20px', background: 'var(--color-primary)', border: 'none',
                                    color: 'white', borderRadius: '5px', cursor: 'pointer'
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header with Timer (optional) and Submit */}
            <div style={{ padding: '10px 20px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>Physics Exam Platform</h2>
                <button
                    onClick={() => showConfirm("Are you sure you want to finish the exam? You cannot go back.", () => { submitExamLogic(); closeConfirm(); })}
                    style={{
                        padding: '8px 20px',
                        background: '#10b981', // Green
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    Finish Exam
                </button>
            </div>

            {/* Mobile Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                <button
                    onClick={() => setActiveTab('coding')}
                    style={{
                        flex: 1,
                        padding: '15px',
                        background: activeTab === 'coding' ? 'var(--color-background)' : 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'coding' ? '2px solid var(--color-primary)' : 'none',
                        color: activeTab === 'coding' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    Coding Section
                </button>
                <button
                    onClick={() => setActiveTab('quiz')}
                    style={{
                        flex: 1,
                        padding: '15px',
                        background: activeTab === 'quiz' ? 'var(--color-background)' : 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'quiz' ? '2px solid var(--color-primary)' : 'none',
                        color: activeTab === 'quiz' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    Quiz Section
                </button>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                {/* Quiz Tab */}
                <div style={{
                    flex: 1,
                    display: activeTab === 'quiz' ? 'block' : 'none',
                    overflowY: 'auto',
                    borderRight: '1px solid var(--color-border)'
                }}>
                    <QuizSection questions={questions.quiz} onAnswer={handleQuizAnswer} />
                </div>

                {/* Coding Tab */}
                <div style={{
                    flex: 1,
                    display: activeTab === 'coding' ? 'flex' : 'none',
                    flexDirection: 'column',
                    height: '100%',
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '15px 20px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <div>
                            <h2 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', color: 'var(--color-text)' }}>
                                {questions.coding[currentCodingQ]?.title || `Coding Question ${currentCodingQ + 1}`}
                            </h2>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.9em', color: executionsUsed >= 5 ? 'var(--color-error)' : 'var(--color-text-secondary)', fontWeight: 'bold' }}>
                                    Executions: {executionsUsed} / 5
                                </span>
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setCurrentCodingQ(prev => Math.max(0, prev - 1))}
                                disabled={currentCodingQ === 0}
                                className="btn"
                                style={{
                                    padding: '5px 15px',
                                    fontSize: '0.9rem',
                                    background: currentCodingQ === 0 ? 'var(--color-surface)' : 'var(--color-primary)',
                                    opacity: currentCodingQ === 0 ? 0.5 : 1,
                                    cursor: currentCodingQ === 0 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                &larr; Prev
                            </button>
                            <button
                                onClick={() => setCurrentCodingQ(prev => Math.min(questions.coding.length - 1, prev + 1))}
                                disabled={currentCodingQ === questions.coding.length - 1}
                                className="btn"
                                style={{
                                    padding: '5px 15px',
                                    fontSize: '0.9rem',
                                    background: currentCodingQ === questions.coding.length - 1 ? 'var(--color-surface)' : 'var(--color-primary)',
                                    opacity: currentCodingQ === questions.coding.length - 1 ? 0.5 : 1,
                                    cursor: currentCodingQ === questions.coding.length - 1 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Next &rarr;
                            </button>
                        </div>

                        {/* Spacer to avoid overlap with fixed theme toggle */}
                        <div style={{ width: '50px' }}></div>
                    </div>

                    <div style={{ padding: '15px 20px', background: 'var(--color-background)', borderBottom: '1px solid var(--color-border)', maxHeight: '150px', overflowY: 'auto', flexShrink: 0 }}>
                        <p style={{ margin: 0, color: 'var(--color-text)', lineHeight: '1.6' }}>
                            {questions.coding[currentCodingQ]?.description}
                        </p>
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <CodingWorkspace
                            key={currentCodingQ} // Force re-render on question change to reset editor state if needed, or handle via prop
                            initialCode={codeState[currentCodingQ] || questions.coding[currentCodingQ]?.initial_code}
                            onRun={handleRunCode}
                            onSubmit={handleSubmitCode}
                            output={output}
                            status={status}
                            imageData={imageData}
                            disabled={executionsUsed >= 5}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
