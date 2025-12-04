import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Admin() {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('exams');
    const [exams, setExams] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [qType, setQType] = useState('coding');
    const [codingQ, setCodingQ] = useState({
        title: '', description: '', initial_code: '', solution_code: '', test_cases: '[]', points: 10
    });
    const [quizQ, setQuizQ] = useState({
        type: 'mcq', question: '', options: '[]', correct_answer: '', points: 5
    });
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [results, setResults] = useState({ coding: [], quiz: [] });
    const [existingQuestions, setExistingQuestions] = useState({ coding: [], quiz: [] });
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [, setEditingType] = useState(null);
    const [studentUsernames, setStudentUsernames] = useState('');
    const [creationResults, setCreationResults] = useState(null);

    const fetchExams = useCallback(async () => {
        const res = await fetch(`${API_URL}/admin/exams`);
        if (res.ok) {
            const data = await res.json();
            setExams(data);
        }
    }, []);

    // Fetch exams on mount - this is the correct pattern for data fetching

    useEffect(() => {
        const loadExams = async () => {
            await fetchExams();
        };
        loadExams();
    }, [fetchExams]);

    const fetchBlockedUsers = useCallback(async () => {
        if (!selectedExamId) return;
        const res = await fetch(`${API_URL}/admin/blocked-users/${selectedExamId}`);
        if (res.ok) {
            const data = await res.json();
            setBlockedUsers(data);
        }
    }, [selectedExamId]);

    const fetchResults = useCallback(async () => {
        if (!selectedExamId) return;
        const res = await fetch(`${API_URL}/admin/exam-results/${selectedExamId}`);
        if (res.ok) {
            const data = await res.json();
            setResults(data);
        }
    }, [selectedExamId]);

    const fetchExistingQuestions = useCallback(async () => {
        if (!selectedExamId) return;
        const res = await fetch(`${API_URL}/admin/exam-questions/${selectedExamId}`);
        if (res.ok) {
            const data = await res.json();
            setExistingQuestions(data);
        }
    }, [selectedExamId]);

    // Fetch data when tab or exam changes - this is the correct pattern for data fetching

    useEffect(() => {
        const loadData = async () => {
            if (activeTab === 'security') await fetchBlockedUsers();
            if (activeTab === 'results') await fetchResults();
            if (activeTab === 'exams' && selectedExamId) await fetchExistingQuestions();
        };
        loadData();
    }, [activeTab, selectedExamId, fetchBlockedUsers, fetchResults, fetchExistingQuestions]);

    const createExam = async () => {
        await fetch(`${API_URL}/admin/create-exam`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description })
        });
        alert('Exam Created');
        setTitle('');
        setDescription('');
        fetchExams();
    };

    const toggleExamStatus = async (exam) => {
        const endpoint = exam.is_active ? 'stop-exam' : 'start-exam';
        await fetch(`${API_URL}/admin/${endpoint}/${exam.id}`, { method: 'POST' });
        fetchExams();
    };

    const addCodingQuestion = async () => {
        if (!selectedExamId) return alert('Select an exam first');
        await fetch(`${API_URL}/admin/add-coding-question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...codingQ, exam_id: selectedExamId })
        });
        alert('Coding Question Added');
        setCodingQ({ title: '', description: '', initial_code: '', solution_code: '', test_cases: '[]', points: 10 });
        fetchExistingQuestions();
    };

    const addQuizQuestion = async () => {
        if (!selectedExamId) return alert('Select an exam first');
        await fetch(`${API_URL}/admin/add-quiz-question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...quizQ, exam_id: selectedExamId })
        });
        alert('Quiz Question Added');
        setQuizQ({ type: 'mcq', question: '', options: '[]', correct_answer: '', points: 5 });
        fetchExistingQuestions();
    };

    const updateCodingQuestion = async () => {
        if (!editingQuestion) return;
        await fetch(`${API_URL}/admin/update-coding-question/${editingQuestion.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(codingQ)
        });
        alert('Question Updated');
        setEditingQuestion(null);
        setCodingQ({ title: '', description: '', initial_code: '', solution_code: '', test_cases: '[]', points: 10 });
        fetchExistingQuestions();
    };

    const updateQuizQuestion = async () => {
        if (!editingQuestion) return;
        await fetch(`${API_URL}/admin/update-quiz-question/${editingQuestion.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quizQ)
        });
        alert('Question Updated');
        setEditingQuestion(null);
        setQuizQ({ type: 'mcq', question: '', options: '[]', correct_answer: '', points: 5 });
        fetchExistingQuestions();
    };

    const deleteCodingQuestion = async (id) => {
        if (!confirm('Are you sure you want to delete this question?')) return;
        await fetch(`${API_URL}/admin/delete-coding-question/${id}`, { method: 'DELETE' });
        alert('Question Deleted');
        fetchExistingQuestions();
    };

    const deleteQuizQuestion = async (id) => {
        if (!confirm('Are you sure you want to delete this question?')) return;
        await fetch(`${API_URL}/admin/delete-quiz-question/${id}`, { method: 'DELETE' });
        alert('Question Deleted');
        fetchExistingQuestions();
    };

    const startEditCoding = (question) => {
        setEditingQuestion(question);
        setEditingType('coding');
        setCodingQ({
            title: question.title,
            description: question.description,
            initial_code: question.initial_code,
            solution_code: question.solution_code,
            test_cases: JSON.stringify(question.test_cases),
            points: question.points
        });
        setQType('coding');
    };

    const startEditQuiz = (question) => {
        setEditingQuestion(question);
        setEditingType('quiz');
        setQuizQ({
            type: question.type,
            question: question.question,
            options: JSON.stringify(question.options),
            correct_answer: question.correct_answer,
            points: question.points
        });
        setQType('quiz');
    };

    const cancelEdit = () => {
        setEditingQuestion(null);
        setEditingType(null);
        setCodingQ({ title: '', description: '', initial_code: '', solution_code: '', test_cases: '[]', points: 10 });
        setQuizQ({ type: 'mcq', question: '', options: '[]', correct_answer: '', points: 5 });
    };

    const createStudents = async () => {
        if (!studentUsernames.trim()) return alert('Please enter at least one username');

        // Split by newlines and filter empty lines
        const usernames = studentUsernames.split('\n').map(u => u.trim()).filter(u => u.length > 0);

        if (usernames.length === 0) return alert('Please enter valid usernames');

        const res = await fetch(`${API_URL}/admin/create-students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames })
        });

        if (res.ok) {
            const data = await res.json();
            setCreationResults(data.results);
            alert(data.message);
        } else {
            alert('Failed to create students');
        }
    };

    const unblockUser = async (userId) => {
        await fetch(`${API_URL}/admin/unblock-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exam_id: selectedExamId, user_id: userId })
        });
        fetchBlockedUsers();
    };

    const downloadStudentPDF = (userId) => {
        try {
            const doc = new jsPDF();
            const examTitle = exams.find(e => e.id === selectedExamId)?.title || 'Exam';

            doc.setFontSize(18);
            doc.text(`${examTitle} - Student Report`, 14, 22);
            doc.setFontSize(12);
            doc.text(`Student ID: ${userId}`, 14, 30);

            doc.setFontSize(14);
            doc.text('Coding Submissions', 14, 40);
            doc.save(`exam_report_${userId}.pdf`);
        } catch (err) {
            console.error("PDF Generation Error:", err);
            alert("Failed to generate PDF. Please check console for details.");
        }
    };

    const getStudentResults = () => {
        const students = {};

        results.coding.forEach(r => {
            if (!students[r.user_id]) students[r.user_id] = {
                id: r.user_id,
                email: r.email, // Capture email
                codingScore: 0,
                quizScore: 0,
                lastActive: r.created_at
            };
            students[r.user_id].codingScore += (r.score || 0);
        });

        results.quiz.forEach(r => {
            if (!students[r.user_id]) students[r.user_id] = {
                id: r.user_id,
                email: r.email, // Capture email
                codingScore: 0,
                quizScore: 0,
                lastActive: r.created_at
            };
            students[r.user_id].quizScore += (r.score || 0);
        });

        return Object.values(students);
    };

    const selectedExam = exams.find(e => e.id === selectedExamId);

    return (
        <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
            <div className="card" style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #1e293b, #0f172a)' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '2rem' }}>⚡</span>
                        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Admin Control Center</h1>
                    </div>
                    <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>Manage your quiz platform with advanced controls</p>
                </div>
                <button onClick={() => { signOut(); navigate('/login'); }} className="btn btn-danger">Logout</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {[
                    { id: 'exams', icon: '📝', label: 'Questions', desc: 'Manage quiz questions' },
                    { id: 'students', icon: '👨‍🎓', label: 'Students', desc: 'Create student accounts' },
                    { id: 'security', icon: '👥', label: 'User Management', desc: 'Manage user access' },
                    { id: 'results', icon: '📊', label: 'Results', desc: 'View quiz results' },
                    { id: 'settings', icon: '⚙️', label: 'Settings', desc: 'Configure quiz settings' },
                ].map(item => (
                    <div
                        key={item.id}
                        className="card"
                        onClick={() => setActiveTab(item.id)}
                        style={{
                            cursor: 'pointer',
                            border: activeTab === item.id ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                            background: activeTab === item.id ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-card)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{item.icon}</div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.label}</div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{item.desc}</div>
                    </div>
                ))}
            </div>

            <div className="card" style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <h3 style={{ margin: 0, whiteSpace: 'nowrap' }}>Select Active Exam:</h3>
                    <select
                        value={selectedExamId || ''}
                        onChange={e => setSelectedExamId(e.target.value)}
                        className="input-field"
                        style={{ maxWidth: '400px' }}
                    >
                        <option value="">-- Select Exam --</option>
                        {exams.map(e => <option key={e.id} value={e.id}>{e.title} ({e.is_active ? 'Active' : 'Inactive'})</option>)}
                    </select>
                </div>
            </div>

            {activeTab === 'exams' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                    <div>
                        <div className="card" style={{ marginBottom: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2>Existing Exams</h2>
                                <span style={{ background: '#3b82f6', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem' }}>{exams.length} Exams</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {exams.map(exam => (
                                    <div key={exam.id} style={{
                                        background: 'rgba(15, 23, 42, 0.5)',
                                        padding: '15px',
                                        borderRadius: '12px',
                                        border: selectedExamId === exam.id ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>{exam.title}</h3>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    background: exam.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                                                    color: exam.is_active ? '#4ade80' : '#94a3b8'
                                                }}>
                                                    {exam.is_active ? 'ACTIVE' : 'INACTIVE'}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedExamId(exam.id)}
                                            className="btn"
                                            style={{ background: 'rgba(255,255,255,0.1)', fontSize: '0.8rem' }}
                                        >
                                            Select
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="card">
                            <h2>Create New Exam</h2>
                            <div className="input-group">
                                <label className="input-label">Exam Title</label>
                                <input className="input-field" placeholder="e.g. Midterm Physics" value={title} onChange={e => setTitle(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Description</label>
                                <textarea className="input-field" placeholder="Brief description..." value={description} onChange={e => setDescription(e.target.value)} style={{ minHeight: '80px' }} />
                            </div>
                            <button onClick={createExam} className="btn btn-primary w-full">Create Exam</button>
                        </div>
                    </div>

                    <div>
                        {selectedExamId ? (
                            <div className="card">
                                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <h2>{editingQuestion ? 'Edit Question' : 'Add Questions'}</h2>
                                    <p style={{ color: '#94a3b8' }}>{editingQuestion ? 'Editing' : 'Adding to'}: <strong style={{ color: 'white' }}>{exams.find(e => e.id === selectedExamId)?.title}</strong></p>
                                    {editingQuestion && (
                                        <button onClick={cancelEdit} className="btn" style={{ marginTop: '10px', background: '#64748b', fontSize: '0.85rem' }}>Cancel Edit</button>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                    <button onClick={() => setQType('coding')} className="btn" style={{ flex: 1, background: qType === 'coding' ? '#3b82f6' : 'rgba(255,255,255,0.1)' }}>Coding Question</button>
                                    <button onClick={() => setQType('quiz')} className="btn" style={{ flex: 1, background: qType === 'quiz' ? '#3b82f6' : 'rgba(255,255,255,0.1)' }}>Quiz Question</button>
                                </div>

                                {qType === 'coding' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <input className="input-field" placeholder="Title" value={codingQ.title} onChange={e => setCodingQ({ ...codingQ, title: e.target.value })} />
                                        <textarea className="input-field" placeholder="Description" value={codingQ.description} onChange={e => setCodingQ({ ...codingQ, description: e.target.value })} />
                                        <textarea className="input-field" placeholder="Initial Code" value={codingQ.initial_code} onChange={e => setCodingQ({ ...codingQ, initial_code: e.target.value })} style={{ fontFamily: 'monospace' }} />
                                        <textarea className="input-field" placeholder="Solution Code" value={codingQ.solution_code} onChange={e => setCodingQ({ ...codingQ, solution_code: e.target.value })} style={{ fontFamily: 'monospace' }} />
                                        <textarea className="input-field" placeholder='Test Cases (JSON) e.g. [{"input": "1", "output": "1"}]' value={codingQ.test_cases} onChange={e => setCodingQ({ ...codingQ, test_cases: e.target.value })} style={{ fontFamily: 'monospace' }} />
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '-10px', marginBottom: '10px' }}>
                                            Format: <code>[&#123;"input": "arg1", "output": "expected"&#125;]</code>
                                        </div>
                                        <div style={{ marginTop: '10px' }}>
                                            <label style={{ display: 'block', marginBottom: '5px', color: '#94a3b8', fontSize: '0.9rem' }}>Points / Marks</label>
                                            <input type="number" className="input-field" placeholder="e.g. 10" value={codingQ.points} onChange={e => setCodingQ({ ...codingQ, points: parseInt(e.target.value) })} />
                                        </div>
                                        <button onClick={editingQuestion ? updateCodingQuestion : addCodingQuestion} className="btn btn-primary" style={{ marginTop: '10px' }}>
                                            {editingQuestion ? 'Update Coding Question' : 'Add Coding Question'}
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <select className="input-field" value={quizQ.type} onChange={e => setQuizQ({ ...quizQ, type: e.target.value })}>
                                            <option value="mcq">Multiple Choice</option>
                                            <option value="true_false">True/False</option>
                                            <option value="short">Short Answer</option>
                                        </select>
                                        <textarea className="input-field" placeholder="Question" value={quizQ.question} onChange={e => setQuizQ({ ...quizQ, question: e.target.value })} />
                                        {quizQ.type === 'mcq' && (
                                            <>
                                                <textarea className="input-field" placeholder='Options (JSON Array) e.g. ["Option A", "Option B"]' value={quizQ.options} onChange={e => setQuizQ({ ...quizQ, options: e.target.value })} />
                                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '-10px', marginBottom: '10px' }}>
                                                    Format: <code>["Option 1", "Option 2", "Option 3", "Option 4"]</code>
                                                </div>
                                            </>
                                        )}
                                        <input className="input-field" placeholder="Correct Answer" value={quizQ.correct_answer} onChange={e => setQuizQ({ ...quizQ, correct_answer: e.target.value })} />
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '5px', color: '#94a3b8', fontSize: '0.9rem' }}>Points / Marks</label>
                                            <input type="number" className="input-field" placeholder="e.g. 5" value={quizQ.points} onChange={e => setQuizQ({ ...quizQ, points: parseInt(e.target.value) })} />
                                        </div>
                                        <button onClick={editingQuestion ? updateQuizQuestion : addQuizQuestion} className="btn btn-primary" style={{ marginTop: '10px' }}>
                                            {editingQuestion ? 'Update Quiz Question' : 'Add Quiz Question'}
                                        </button>
                                    </div>
                                )}

                                {/* Existing Questions List */}
                                <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                    <h3 style={{ marginBottom: '15px' }}>Existing Questions</h3>

                                    {existingQuestions.coding.length > 0 && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <h4 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '10px' }}>Coding Questions ({existingQuestions.coding.length})</h4>
                                            {existingQuestions.coding.map((q, idx) => (
                                                <div key={q.id} style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{idx + 1}. {q.title}</div>
                                                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '5px' }}>{q.description.substring(0, 100)}...</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Points: {q.points}</div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px', marginLeft: '10px' }}>
                                                            <button onClick={() => startEditCoding(q)} className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#3b82f6' }}>Edit</button>
                                                            <button onClick={() => deleteCodingQuestion(q.id)} className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#ef4444' }}>Delete</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {existingQuestions.quiz.length > 0 && (
                                        <div>
                                            <h4 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '10px' }}>Quiz Questions ({existingQuestions.quiz.length})</h4>
                                            {existingQuestions.quiz.map((q, idx) => (
                                                <div key={q.id} style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{idx + 1}. {q.question.substring(0, 80)}...</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Type: {q.type} | Points: {q.points}</div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px', marginLeft: '10px' }}>
                                                            <button onClick={() => startEditQuiz(q)} className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#3b82f6' }}>Edit</button>
                                                            <button onClick={() => deleteQuizQuestion(q.id)} className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#ef4444' }}>Delete</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {existingQuestions.coding.length === 0 && existingQuestions.quiz.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '0.9rem' }}>
                                            No questions added yet. Add your first question above!
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="card" style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', borderStyle: 'dashed' }}>
                                <p>Select an exam from the list to add questions</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'students' && (
                <div className="card">
                    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <h2>Bulk Create Student Accounts</h2>
                        <p style={{ color: '#94a3b8', marginTop: '10px' }}>
                            Enter student usernames (one per line). Each student will be created with:
                        </p>
                        <ul style={{ color: '#94a3b8', marginLeft: '20px', marginTop: '10px' }}>
                            <li>Email: <code>username@klu.ac.in</code></li>
                            <li>Password: <code>username</code> (same as username)</li>
                            <li>Role: Student</li>
                        </ul>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                        <div>
                            <div className="input-group">
                                <label className="input-label">Student Usernames (one per line)</label>
                                <textarea
                                    className="input-field"
                                    placeholder="student1&#10;student2&#10;student3"
                                    value={studentUsernames}
                                    onChange={e => setStudentUsernames(e.target.value)}
                                    style={{ minHeight: '300px', fontFamily: 'monospace' }}
                                />
                            </div>
                            <button onClick={createStudents} className="btn btn-primary w-full" style={{ marginTop: '15px' }}>
                                Create Student Accounts
                            </button>
                        </div>

                        <div>
                            <h3 style={{ marginBottom: '15px' }}>Creation Results</h3>
                            {!creationResults ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px' }}>
                                    Results will appear here after creating accounts
                                </div>
                            ) : (
                                <div>
                                    {creationResults.successful.length > 0 && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <h4 style={{ fontSize: '0.9rem', color: '#4ade80', marginBottom: '10px' }}>
                                                ✓ Successfully Created ({creationResults.successful.length})
                                            </h4>
                                            <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', padding: '15px', maxHeight: '300px', overflowY: 'auto' }}>
                                                {creationResults.successful.map((result, idx) => (
                                                    <div key={idx} style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                                                        <div style={{ fontWeight: 'bold' }}>{result.username}</div>
                                                        <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{result.email}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {creationResults.failed.length > 0 && (
                                        <div>
                                            <h4 style={{ fontSize: '0.9rem', color: '#f87171', marginBottom: '10px' }}>
                                                ✗ Failed ({creationResults.failed.length})
                                            </h4>
                                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', padding: '15px', maxHeight: '300px', overflowY: 'auto' }}>
                                                {creationResults.failed.map((result, idx) => (
                                                    <div key={idx} style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                                                        <div style={{ fontWeight: 'bold' }}>{result.username}</div>
                                                        <div style={{ color: '#f87171', fontSize: '0.75rem' }}>{result.error}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'security' && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2>User Management</h2>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <span style={{ background: '#22c55e', padding: '5px 10px', borderRadius: '4px', fontSize: '0.8rem', color: 'white' }}>Live Updates</span>
                            <button onClick={fetchBlockedUsers} className="btn" style={{ padding: '5px 15px', fontSize: '0.8rem', background: '#3b82f6' }}>Refresh</button>
                        </div>
                    </div>

                    {!selectedExamId ? <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Select an exam to view blocked users</div> : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                                        <th style={{ padding: '15px', textAlign: 'left' }}>User ID</th>
                                        <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
                                        <th style={{ padding: '15px', textAlign: 'left' }}>Reason</th>
                                        <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {blockedUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No blocked users found for this exam.</td>
                                        </tr>
                                    ) : (
                                        blockedUsers.map(u => (
                                            <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '15px', fontFamily: 'monospace' }}>{u.user_id}</td>
                                                <td style={{ padding: '15px' }}>
                                                    <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Blocked</span>
                                                </td>
                                                <td style={{ padding: '15px' }}>{u.reason}</td>
                                                <td style={{ padding: '15px' }}>
                                                    <button onClick={() => unblockUser(u.user_id)} className="btn" style={{ background: '#3b82f6', padding: '6px 12px', fontSize: '0.85rem' }}>
                                                        Unblock Access
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'results' && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2>Quiz Results Dashboard</h2>
                        <span style={{ background: '#3b82f6', padding: '5px 10px', borderRadius: '4px', fontSize: '0.8rem', color: 'white' }}>Total Results: {getStudentResults().length}</span>
                    </div>
                    {!selectedExamId ? <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Select an exam to view results</div> : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                                        <th style={{ padding: '15px', textAlign: 'left' }}>User ID</th>
                                        <th style={{ padding: '15px', textAlign: 'left' }}>Coding Score</th>
                                        <th style={{ padding: '15px', textAlign: 'left' }}>Quiz Score</th>
                                        <th style={{ padding: '15px', textAlign: 'left' }}>Total Score</th>
                                        <th style={{ padding: '15px', textAlign: 'left' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getStudentResults().length === 0 ? (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No results found. Students haven't completed the quiz yet.</td>
                                        </tr>
                                    ) : (
                                        getStudentResults().map(student => (
                                            <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '15px', fontFamily: 'monospace' }}>{student.email || student.id}</td>
                                                <td style={{ padding: '15px' }}>{student.codingScore}</td>
                                                <td style={{ padding: '15px' }}>{student.quizScore}</td>
                                                <td style={{ padding: '15px', fontWeight: 'bold', color: '#4ade80' }}>{student.codingScore + student.quizScore}</td>
                                                <td style={{ padding: '15px' }}>
                                                    <button
                                                        onClick={() => downloadStudentPDF(student.id)}
                                                        className="btn"
                                                        style={{ background: '#22c55e', padding: '6px 12px', fontSize: '0.85rem' }}
                                                    >
                                                        Download PDF
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="card">
                    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <h2>Quiz Settings</h2>
                        <p style={{ color: '#94a3b8' }}>Configure settings for: <strong style={{ color: 'white' }}>{selectedExam?.title || 'No Exam Selected'}</strong></p>
                    </div>

                    {!selectedExamId ? <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Select an exam to configure settings</div> : (
                        <div style={{ maxWidth: '600px' }}>
                            <div style={{ marginBottom: '30px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                    <input type="checkbox" id="useAll" style={{ width: 'auto' }} disabled />
                                    <label htmlFor="useAll" style={{ color: '#94a3b8' }}>Use All Available Questions (Coming Soon)</label>
                                </div>
                                <div style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '24px' }}>
                                    When enabled, students will receive all questions in random order.
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Number of Questions per Quiz</label>
                                <input className="input-field" type="number" value="10" disabled style={{ background: 'rgba(15, 23, 42, 0.3)', color: '#64748b' }} />
                                <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '5px' }}>
                                    Set how many questions each student will receive in their quiz.
                                </div>
                            </div>

                            <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '15px' }}>Quiz Status: <span style={{ color: selectedExam?.is_active ? '#4ade80' : '#94a3b8' }}>{selectedExam?.is_active ? 'Active' : 'Inactive'}</span></h3>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedExam?.is_active || false}
                                            onChange={() => toggleExamStatus(selectedExam)}
                                            style={{ opacity: 0, width: 0, height: 0 }}
                                        />
                                        <span style={{
                                            position: 'absolute',
                                            cursor: 'pointer',
                                            top: 0, left: 0, right: 0, bottom: 0,
                                            backgroundColor: selectedExam?.is_active ? '#3b82f6' : '#475569',
                                            borderRadius: '34px',
                                            transition: '.4s'
                                        }}>
                                            <span style={{
                                                position: 'absolute',
                                                content: "",
                                                height: '20px', width: '20px',
                                                left: selectedExam?.is_active ? '26px' : '4px',
                                                bottom: '4px',
                                                backgroundColor: 'white',
                                                borderRadius: '50%',
                                                transition: '.4s'
                                            }}></span>
                                        </span>
                                    </label>
                                    <span style={{ color: '#94a3b8' }}>
                                        {selectedExam?.is_active ? 'Quiz is currently live' : 'Quiz is currently stopped'}
                                    </span>
                                </div>
                                <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '10px' }}>
                                    Students cannot access the quiz while it's stopped.
                                </div>
                            </div>

                            <button className="btn btn-primary" style={{ marginTop: '30px' }} onClick={() => alert('Settings Saved')}>Save Settings</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
