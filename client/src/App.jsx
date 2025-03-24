import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ControlPage from './pages/ControlPage'
import InfoPage from './pages/InfoPage'
import MarsRoverPage from './pages/MarsRoverPage'

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/control" element={<ControlPage />} />
                <Route path="/info" element={<InfoPage />} />
                <Route path="/play" element={<MarsRoverPage />} />
            </Routes>
        </Router>
    )
}

export default App
