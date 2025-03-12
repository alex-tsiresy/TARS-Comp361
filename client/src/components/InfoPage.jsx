import { useNavigate } from "react-router-dom";

function InfoPage() {
    const navigate = useNavigate();

    return (
        <div className="info-page">
            <div className="header">
                <button className="back-button" onClick={() => navigate("/")}>⏴ Back</button>
                <h1 className="title">🚀 Mars Rover Control Information</h1>
            </div>

            <div className="info-card">
                <h2 className="subtitle">🌍 Mission Goals</h2>
                <p className="text">
                    The rover's mission is to explore designated Martian terrain, collect data, and assist in planetary research.
                </p>
            </div>

            <div className="info-card">
                <h2 className="subtitle">🎮 How to Control the Rover</h2>
                <ul className="list">
                    <li><strong>Navigation:</strong> Use the on-screen joystick or arrow keys.</li>
                    <li><strong>Telemetry:</strong> Monitor real-time data (position, speed, sensors).</li>
                    <li><strong>Commands:</strong> Issue actions via the command panel.</li>
                    <li><strong>Modes:</strong> Switch between AI-driven and manual control.</li>
                </ul>
            </div>

            <div className="info-card">
                <h2 className="subtitle">🧐 About the Mars Rovers</h2>
                <p className="text">
                    NASA has sent several robotic rovers to Mars to explore its surface. Each has unique capabilities:
                </p>
                <ul className="list">
                    <li><strong>Curiosity:</strong> Launched in 2011, it analyzes rock samples and searches for signs of past life.</li>
                    <li><strong>Perseverance:</strong> Landed in 2021, carries a helicopter (Ingenuity), and is searching for biosignatures.</li>
                    <li><strong>Opportunity & Spirit:</strong> Twin rovers that exceeded their mission expectations, exploring for years.</li>
                </ul>
            </div>

        </div>
    );
}

export default InfoPage;