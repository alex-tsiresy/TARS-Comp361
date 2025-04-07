import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/HomePage.css';
import axios from "axios";

function HomePage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [isRegistering, setIsRegistering] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');

    const [errorMessage, setErrorMessage] = useState('');
    const [message, setMessage] = useState('');
    const [successStep, setSuccessStep] = useState(false); 

    const [showLogin, setShowLogin] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token")); 
    const [logoutStep, setLogoutStep] = useState(0); 

    const [glitchText, setGlitchText] = useState('MARS ROVER');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
    
        try {
            const API_URL = import.meta.env.VITE_API_URL;
    
            const response = await axios.post(`${API_URL}/api/auth/login`, {
                username: username,
                password: password,
            });
    
            const token = response.data.token;
            localStorage.setItem("token", token);
            setMessage("Login successful! Welcome back.");
            setErrorMessage('');
            setUsername(''); 
            setEmail(''); 
            setPassword(''); 
            setConfirmPassword(''); 
            setIsLoggedIn(true);
            setSuccessStep(true); 
    
            setTimeout(() => {
                setSuccessStep(false);
                setShowLogin(false); 
                navigate("/"); 
            }, 1500);
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message || "Login failed. Please try again."
            );
        }
    };

    const handleRegister = async (event) => {
        event.preventDefault();
    
        if (!username || !email || !password || !confirmPassword) {
            setErrorMessage("All fields are required. Please fill them out.");
            return;
        }
    
        if (password.length < 9) {
            setErrorMessage("Password must be at least 9 characters long");
            return;
        }
    
        if (password !== confirmPassword) {
            setErrorMessage("Password inputs don't match");
            return;
        }
    
        if (!email.includes('@')) {
            setErrorMessage("Invalid email format");
            return;
        }
    
        try {
            const API_URL = import.meta.env.VITE_API_URL;
            const response = await axios.post(`${API_URL}/api/auth/register`, {
                username,
                email,
                password,
                confirmPassword: confirmPassword,
            });
    
            const token = response.data.token;
            localStorage.setItem("token", token);
            setIsLoggedIn(true);
            setMessage("Registration successful! Welcome aboard.");
            setErrorMessage('');
            setUsername(''); 
            setEmail('');
            setPassword(''); 
            setConfirmPassword(''); 
            setSuccessStep(true); 
    
            setTimeout(() => {
                setSuccessStep(false);
                setShowLogin(false); 
                navigate("/"); 
            }, 1500);
        } catch (error) {
            setErrorMessage(error.response?.data?.message || "Registration failed");
        }
    };


    const handleLogout = () => {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
        setErrorMessage('');
        setMessage("You have been logged out successfully.");
        setSuccessStep(true); 
    
        setTimeout(() => {
            setSuccessStep(false);
            setLogoutStep(0); 
            navigate("/");
        }, 1500);
    };


    const startLogoutProcess = () => {
        setLogoutStep(1); 
    };

    const proceedToLogoutConfirmation = () => {
        setLogoutStep(2); 
    };

    const cancelLogout = () => {
        setLogoutStep(0); 
    };

    // Glitch effect for the title
    useEffect(() => {
        const interval = setInterval(() => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
            let newText = '';
            const originalText = 'MARS ROVER';

            for (let i = 0; i < originalText.length; i++) {
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

                    {isLoggedIn ? (
                        <button
                            className="control-button"
                            onClick={startLogoutProcess}
                        >
                            <span className="button-icon">⎋</span>
                            <span className="button-text">LOG OUT</span>
                        </button>
                    ) : (
                        <button
                            className="control-button"
                            onClick={() => setShowLogin(!showLogin)}
                        >
                            <span className="button-icon">⊡</span>
                            <span className="button-text">OPERATOR LOGIN</span>
                        </button>
                    )}
                </div>
            </div>

            {showLogin && (
                <div className="login-modal">
                    <div className="login-content">
                        <div className="login-header">
                            <h3>{isRegistering ? 'OPERATOR REGISTRATION' : 'OPERATOR AUTHENTICATION'}</h3>
                            <button
                                className="close-button"
                                onClick={() => setShowLogin(false)}
                            >
                                ×
                            </button>
                        </div>
                        {isRegistering ? (
                            <form onSubmit={handleRegister}>
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
                                    <label>OPERATOR EMAIL</label>
                                    <input
                                        type="text"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
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
                                <div className="input-group">
                                    <label>CONFIRM ACCESS CODE</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                {errorMessage && <p className="error-message">{errorMessage}</p>}
                                <button type="submit" className="login-button">
                                    REGISTER
                                </button>
                            </form>
                        ) : (
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
                                {errorMessage && <p className="error-message">{errorMessage}</p>}
                                <button type="submit" className="login-button">
                                    AUTHENTICATE
                                </button>
                            </form>
                        )}
                        <div className="toggle-auth">
                            <button
                                className="toggle-button"
                                onClick={() => setIsRegistering(!isRegistering)}
                            >
                                {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {logoutStep === 1 && !successStep && (
                <div className="login-modal">
                    <div className="logout-content">
                        <h3>Do you want to save your progress?</h3>
                        <button className="save-button" onClick={proceedToLogoutConfirmation}>Save Progress</button>
                        <button className="confirm-button" onClick={proceedToLogoutConfirmation}>
                            Skip
                        </button>
                    </div>
                </div>
            )}

            {logoutStep === 2 && !successStep && (
                <div className="login-modal">
                    <div className="logout-content">
                        <h3>Are you sure you want to log out?</h3>
                        <button className="confirm-button" onClick={handleLogout}>Yes</button>
                        <button className="cancel-button" onClick={cancelLogout}>No</button>
                    </div>
                </div>
            )}

            {successStep && (
                <div className="login-modal">
                    <div className="logout-content">
                        <h3>{message}</h3>
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