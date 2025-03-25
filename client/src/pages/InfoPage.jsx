import { useNavigate } from "react-router-dom";
import "../styles/InfoPage.css";

function InfoPage() {
    const navigate = useNavigate();

    return (
        <div className="info-page-container">
            <div className="starfield"></div>
            
            <div className="mission-status">
                <div className="status-indicator"></div>
                MISSION STATUS: ACTIVE
            </div>
            
            <div className="info-header">
                <button className="control-button back-button" onClick={() => navigate("/")}>
                    <span className="button-icon">⏴</span>
                    <span className="button-text">RETURN TO BASE</span>
                </button>
                <h1 className="title">MARS ROVERS CONTROL MANUAL</h1>
            </div>

            <div className="info-content">
                <div className="info-card">
                    <div className="card-header">
                        <div className="header-line"></div>
                        <h2 className="card-title">MISSION GOALS</h2>
                        <div className="header-line"></div>
                    </div>
                    <div className="card-content">
                        <p>
                            The rover's mission is to explore designated Martian terrain, collect data, and assist in planetary research.
                        </p>
                    </div>
                </div>

                <div className="info-card">
                    <div className="card-header">
                        <div className="header-line"></div>
                        <h2 className="card-title">CONTROL PROTOCOLS</h2>
                        <div className="header-line"></div>
                    </div>
                    <div className="card-content">
                        <ul className="control-list">
                            <li><span className="highlight">Navigation:</span> Use the on-screen joystick or arrow keys.</li>
                            <li><span className="highlight">Telemetry:</span> Monitor real-time data (position, speed, sensors).</li>
                            <li><span className="highlight">Commands:</span> Issue actions via the command panel.</li>
                            <li><span className="highlight">Modes:</span> Switch between AI-driven and manual control.</li>
                        </ul>
                    </div>
                </div>

                <div className="info-card">
                    <div className="card-header">
                        <div className="header-line"></div>
                        <h2 className="card-title">ROVER SPECIFICATIONS</h2>
                        <div className="header-line"></div>
                    </div>
                    <div className="card-content">
                        <p>
                            NASA has sent several robotic rovers to Mars to explore its surface. Each has unique capabilities:
                        </p>
                        <ul className="control-list">
                            <li><span className="highlight">Curiosity:</span> Launched in 2011, it analyzes rock samples and searches for signs of past life.</li>
                            <li><span className="highlight">Perseverance:</span> Landed in 2021, carries a helicopter (Ingenuity), and is searching for biosignatures.</li>
                            <li><span className="highlight">Opportunity & Spirit:</span> Twin rovers that exceeded their mission expectations, exploring for years.</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div className="coordinates-footer">
                <span>LAT: 4.5°S</span>
                <span>LONG: 137.4°E</span>
                <span>GALE CRATER, MARS</span>
            </div>
        </div>
    );
}

export default InfoPage;