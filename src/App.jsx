import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DebateFeed from './components/DebateFeed'
import AdminPanel from './components/AdminPanel'
import MobileFeed from './components/MobileFeed'

function App() {
  // Simple port-based routing
  // If on port 5175, show Admin Panel
  // If on port 5173 (or others), show Debate Feed
  const isAdminPort = window.location.port === '5175';

  return (
    <BrowserRouter>
      {isAdminPort ? (
        <AdminPanel />
      ) : (
        <Routes>
          <Route path="/" element={<DebateFeed />} />
          <Route path="/mobile" element={<MobileFeed />} />
        </Routes>
      )}
    </BrowserRouter>
  )
}

export default App
