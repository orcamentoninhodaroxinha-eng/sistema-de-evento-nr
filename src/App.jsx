import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';
import LoginGate from './components/LoginGate';
import Layout from './components/Layout.jsx';
import Events from './pages/Events';
import Roulette from './components/Roulette';
import EventFormPage from './pages/EventFormPage';
import AccountDeletion from './pages/AccountDeletion';
import EventDetailPage from './pages/EventDetailPage';
import Approvals from './pages/Approvals';

const AuthenticatedApp = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Events />} />
        <Route path="/events/new" element={<EventFormPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/account/delete" element={<AccountDeletion />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/roulette" element={<Roulette />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <LoginGate>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </LoginGate>
  )
}

export default App