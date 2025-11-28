import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
    const [exams, setExams] = useState([]);
    const { signOut } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchExams = async () => {
            const { data } = await supabase
                .from('exams')
                .select('*')
                .eq('is_active', true); // Only show active exams

            if (data) setExams(data);
        };
        fetchExams();
    }, []);

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1>Student Dashboard</h1>
                <button onClick={() => { signOut(); navigate('/login'); }} style={{ background: '#ef4444' }}>Logout</button>
            </div>

            <h2>Available Exams</h2>
            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {exams.map(exam => (
                    <div key={exam.id} className="card">
                        <h3>{exam.title}</h3>
                        <p style={{ color: '#94a3b8', marginBottom: '20px' }}>{exam.description}</p>
                        <Link to={`/exam/${exam.id}`}>
                            <button style={{ width: '100%' }}>Start Exam</button>
                        </Link>
                    </div>
                ))}
                {exams.length === 0 && <p>No active exams found.</p>}
            </div>
        </div>
    );
}
