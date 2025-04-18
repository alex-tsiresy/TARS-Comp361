import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import InfoPage from './pages/InfoPage'
import MissionPage from './pages/MissionPage'
import { RobotProvider } from './context/RobotContext'

function App() {
    return (
        <RobotProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/info" element={<InfoPage />} />
                    <Route path="/mission" element={<MissionPage />} />
                </Routes>
            </Router>
        </RobotProvider>
    )
}

export default App
