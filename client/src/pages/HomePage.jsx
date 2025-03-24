import { Link } from 'react-router-dom'
import '../styles/HomePage.css'

function HomePage() {
    return (
        <div className="homepage">
            <h1>Mars Rover Simulator</h1>
            <Link className="button" to="/play">Play</Link>
            <Link className="button" to="/info">How to Play</Link>
        </div>
    )
}

export default HomePage
