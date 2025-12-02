import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import './Login.css';

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
        <div className="login-container">
            {/* Left Side - Marketing */}
            <div className="login-marketing">
                <div className="marketing-pattern" />

                <div className="marketing-content">
                    <div className="marketing-badge">
                        Advanced Quiz Platform
                    </div>
                    <h1 className="marketing-title">
                        Master Your Skills with Interactive Quizzes
                    </h1>
                    <p className="marketing-text">
                        Challenge yourself with our comprehensive quiz platform. Track your progress, compete with others, and enhance your knowledge in a secure, monitored environment.
                    </p>

                    <div className="feature-grid">
                        <div className="feature-item">
                            <span style={{ fontSize: '1.5rem' }}>🔒</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 'bold' }}>Secure Testing</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Proctored environment</div>
                            </div>
                        </div>
                        <div className="feature-item">
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
            <div className="login-form-container">
                <div className="login-card">
                    <div className="login-header">
                        <div className="login-icon">🎯</div>
                        <h2 className="login-title">Student Login</h2>
                        <p className="login-subtitle">Enter your credentials to start your quiz</p>
                    </div>

                    {error && (
                        <div className="error-message">
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
                                placeholder="student@klu.ac.in"
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
                            className="btn login-btn"
                            disabled={loading}
                        >
                            {loading ? 'Logging in...' : 'Start Quiz 🚀'}
                        </button>
                    </form>

                    <div className="login-footer">
                        Make sure you're in a quiet environment with good internet connection.
                    </div>
                </div>
            </div>
        </div>
    );
}
