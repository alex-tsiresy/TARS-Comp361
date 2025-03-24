import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import InfoPage from './pages/InfoPage'
import MarsRoverPage from './pages/MarsRoverPage'
import { RobotProvider } from './context/RobotContext'

function App() {
    return (
        <RobotProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/info" element={<InfoPage />} />
                    <Route path="/play" element={<MarsRoverPage />} />
                </Routes>
            </Router>
        </RobotProvider>
    )
}

export default App
