import { Link } from 'react-router-dom'

function HomePage() {
    return (
        <div className="homepage">
            <h1>Mars AI Simulator</h1>
            <Link className="main-map" to="/ControlPage">Main Map</Link>
            <Link className="button" to="/InfoPage">How to Play</Link>
        </div>
    )
}

export default HomePage
