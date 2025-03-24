import { Link } from 'react-router-dom'
import '../styles/HomePage.css'

function HomePage() {
    return (
        <div className="homepage">
            <h1>Mars Rover Simulator</h1>
            <Link className="button" to="/ControlPage">Main Map</Link>
            <Link className="button play-button" to="/MarsRoverUI">Play</Link>
            <Link className="button" to="/InfoPage">How to Play</Link>
        </div>
    )
}

export default HomePage
