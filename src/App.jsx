import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from "@vercel/analytics/react"
import DebateFeed from './components/DebateFeed'
import AdminPanel from './components/AdminPanel'
import MobileFeed from './components/MobileFeed'

import AuthWrapper from './components/AuthWrapper'

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
          <Route path="/" element={
            <AuthWrapper>
              <DebateFeed />
            </AuthWrapper>
          } />
          <Route path="/mobile" element={<MobileFeed />} />
        </Routes>
      )}
      <Analytics />
    </BrowserRouter>
  )
}

export default App
