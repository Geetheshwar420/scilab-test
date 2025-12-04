import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
    const [exams, setExams] = useState([]);
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedExamId, setSelectedExamId] = useState(null);
    const [hasDownloaded, setHasDownloaded] = useState(false);

    useEffect(() => {
        const fetchExams = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            const { data } = await supabase
                .from('exams')
                .select('*')
                .eq('is_active', true); // Only show active exams
            if (data) setExams(data);
        };
        fetchExams();
    }, []);

    const handleDownloadExecutor = () => {
        if (!user?.id) return;

        const batContent = `@echo off
echo Starting Exam Executor for User: ${user.id}
set USER_ID=${user.id}
set EXECUTION_MODE=local
echo.
echo Please ensure you are in the platform directory.
echo Starting executor...
node executor/index.js
pause`;

        const blob = new Blob([batContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'start_my_exam.bat';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        setHasDownloaded(true);
    };

    const handleStartClick = (examId) => {
        setSelectedExamId(examId);
        setHasDownloaded(false);
        setShowModal(true);
    };

    const handleProceed = () => {
        if (selectedExamId) {
            navigate(`/exam/${selectedExamId}`);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0, color: 'var(--color-text)' }}>Dashboard</h1>
                    <p style={{ color: 'var(--color-text-secondary)', marginTop: '5px' }}>
                        Welcome, <code style={{ userSelect: 'all', fontWeight: 'bold' }}>{user?.id || 'Loading...'}</code>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={signOut} className="btn btn-danger">Sign Out</button>
                </div>
            </div>

            <h2>Available Exams</h2>
            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {exams.map(exam => (
                    <div key={exam.id} className="card">
                        <h3>{exam.title}</h3>
                        <p style={{ color: '#94a3b8', marginBottom: '20px' }}>{exam.description}</p>
                        <button
                            onClick={() => handleStartClick(exam.id)}
                            style={{ width: '100%' }}
                            className="btn btn-primary"
                        >
                            Start Exam
                        </button>
                    </div>
                ))}
                {exams.length === 0 && <p>No active exams found.</p>}
            </div>

            {/* Executor Download Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ maxWidth: '500px', width: '90%', border: '1px solid var(--color-primary)' }}>
                        <h2 style={{ marginTop: 0 }}>⚠️ Executor Required</h2>
                        <p>To run code locally during the exam, you <strong>must</strong> have the executor script running.</p>
                        <p>Please download your personalized startup script below.</p>

                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
                            <h4 style={{ margin: '0 0 10px 0' }}>Instructions:</h4>
                            <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>
                                <li>Click <strong>Download Script</strong> below.</li>
                                <li>Save <code>start_my_exam.bat</code> in your platform folder.</li>
                                <li>Double-click it to start the executor.</li>
                                <li>Keep the executor window OPEN during the exam.</li>
                            </ol>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                onClick={handleDownloadExecutor}
                                className="btn"
                                style={{ background: 'var(--color-secondary)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                            >
                                📥 Download Script
                                {hasDownloaded && <span style={{ marginLeft: '5px' }}>✅</span>}
                            </button>

                            <button
                                onClick={handleProceed}
                                disabled={!hasDownloaded}
                                className="btn btn-primary"
                                style={{ opacity: hasDownloaded ? 1 : 0.5, cursor: hasDownloaded ? 'pointer' : 'not-allowed' }}
                            >
                                {hasDownloaded ? 'Proceed to Exam' : 'Download to Proceed'}
                            </button>

                            <button
                                onClick={() => setShowModal(false)}
                                className="btn"
                                style={{ background: 'transparent', border: '1px solid #475569' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
