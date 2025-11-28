import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { signIn } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { data, error } = await signIn({ email, password });
        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            const role = data.user?.user_metadata?.role;
            if (role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            {/* Left Side - Marketing */}
            <div style={{
                flex: 1,
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '40px',
                color: 'white',
                position: 'relative'
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                    opacity: 0.3
                }} />

                <div style={{ zIndex: 1, textAlign: 'center', maxWidth: '500px' }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.2)',
                        padding: '10px 20px',
                        borderRadius: '20px',
                        display: 'inline-block',
                        marginBottom: '20px',
                        backdropFilter: 'blur(5px)',
                        fontSize: '0.9rem',
                        fontWeight: '600'
                    }}>
                        Advanced Quiz Platform
                    </div>
                    <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', lineHeight: 1.1, textShadow: '0 4px 12px rgba(0,0,0,0.1)', background: 'none', WebkitTextFillColor: 'white' }}>
                        Master Your Skills with Interactive Quizzes
                    </h1>
                    <p style={{ fontSize: '1.1rem', opacity: 0.9, lineHeight: 1.6 }}>
                        Challenge yourself with our comprehensive quiz platform. Track your progress, compete with others, and enhance your knowledge in a secure, monitored environment.
                    </p>

                    <div style={{ display: 'flex', gap: '20px', marginTop: '40px', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.1)', padding: '10px 20px', borderRadius: '12px' }}>
                            <span style={{ fontSize: '1.5rem' }}>🔒</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 'bold' }}>Secure Testing</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Proctored environment</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.1)', padding: '10px 20px', borderRadius: '12px' }}>
                            <span style={{ fontSize: '1.5rem' }}>📊</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 'bold' }}>Real-time Analytics</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Instant feedback</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div style={{ flex: 1, background: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '40px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎯</div>
                        <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Student Login</h2>
                        <p style={{ color: '#94a3b8' }}>Enter your credentials to start your quiz</p>
                    </div>

                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <span>⚠️</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label className="input-label">Email Address</label>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="student@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Password</label>
                            <input
                                type="password"
                                className="input-field"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            style={{ padding: '14px', fontSize: '1.1rem', marginTop: '10px' }}
                            disabled={loading}
                        >
                            {loading ? 'Logging in...' : 'Start Quiz 🚀'}
                        </button>
                    </form>

                    <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem', color: '#64748b' }}>
                        Make sure you're in a quiet environment with good internet connection.
                    </div>
                </div>
            </div>
        </div>
    );
}
