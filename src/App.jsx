import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import LoginGate from './components/LoginGate';
import Layout from './components/Layout';
import Events from './pages/Events';
import EventDetailPage from './pages/EventDetailPage';
import EventFormPage from './pages/EventFormPage';

function App() {

  return (
    <LoginGate>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Events />} />
              <Route path="/events/new" element={<EventFormPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/events/:id/edit" element={<EventFormPage />} />
            </Route>
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </LoginGate>
  )
}

export default App