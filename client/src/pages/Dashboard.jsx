import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
    const [exams, setExams] = useState([]);
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);

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

    const handleStartClick = (examId) => {
        navigate(`/exam/${examId}`);
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
        </div>
    );
}
