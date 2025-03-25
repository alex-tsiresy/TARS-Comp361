import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/HomePage.css';

function HomePage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showLogin, setShowLogin] = useState(false);
    const [glitchText, setGlitchText] = useState('MARS ROVER');
    
    // Glitch effect for the title
    useEffect(() => {
        const interval = setInterval(() => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
            let newText = '';
            const originalText = 'MARS ROVER';
            
            for (let i = 0; i < originalText.length; i++) {
                // 10% chance to replace with a random character
                if (Math.random() < 0.1) {
                    newText += chars.charAt(Math.floor(Math.random() * chars.length));
                } else {
                    newText += originalText[i];
                }
            }
            
            setGlitchText(newText);
        }, 150);
        
        return () => clearInterval(interval);
    }, []);

    const handleLogin = (e) => {
        e.preventDefault();
        // Placeholder for login logic
        console.log('Login attempted with:', username, password);
        setShowLogin(false);
        // Reset form
        setUsername('');
        setPassword('');
    };

    return (
        <div className="homepage-container">
            <div className="mission-status">
                <div className="status-indicator"></div>
                MISSION STATUS: ACTIVE
            </div>
            
            <div className="starfield"></div>
            <div className="glitch-container">
                <h1 className="glitch-text">{glitchText}</h1>
                <h2 className="subtitle">SIMULATION MODULE</h2>
            </div>
            
            <div className="control-panel">
                <div className="panel-section">
                    <Link className="control-button main-button" to="/play">
                        <span className="button-icon">▶</span>
                        <span className="button-text">INITIATE MISSION</span>
                    </Link>
                    
                    <Link className="control-button" to="/info">
                        <span className="button-icon">ℹ</span>
                        <span className="button-text">PROTOCOL MANUAL</span>
                    </Link>
                    
                    <button 
                        className="control-button" 
                        onClick={() => setShowLogin(!showLogin)}
                    >
                        <span className="button-icon">⊡</span>
                        <span className="button-text">OPERATOR LOGIN</span>
                    </button>
                </div>
            </div>
            
            {showLogin && (
                <div className="login-modal">
                    <div className="login-content">
                        <div className="login-header">
                            <h3>OPERATOR AUTHENTICATION</h3>
                            <button 
                                className="close-button" 
                                onClick={() => setShowLogin(false)}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleLogin}>
                            <div className="input-group">
                                <label>OPERATOR ID</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>ACCESS CODE</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className="login-button">
                                AUTHENTICATE
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
            <div className="coordinates-footer">
                <span>LAT: 4.5°S</span>
                <span>LONG: 137.4°E</span>
                <span>GALE CRATER, MARS</span>
            </div>
        </div>
    );
}

export default HomePage;
