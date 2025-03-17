import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './components/HomePage'
import ControlPage from './components/ControlPage'
import InfoPage from './components/InfoPage'
import MarsRoverUI from './components/MarsRoverUI'

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/ControlPage" element={<ControlPage />} />
                <Route path="/InfoPage" element={<InfoPage />} />
                <Route path="/MarsRoverUI" element={<MarsRoverUI />} />
            </Routes>
        </Router>
    )
}

export default App
