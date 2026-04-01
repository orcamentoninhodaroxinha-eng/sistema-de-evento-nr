import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import LoginGate from './components/LoginGate';
import Layout from './components/Layout.jsx';
import Events from './pages/Events';
import EventFormPage from './pages/EventFormPage';
import AccountDeletion from './pages/AccountDeletion';
import EventDetailPage from './pages/EventDetailPage';
import AuthSplash from './components/AuthSplash';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <AuthSplash />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Events />} />
        <Route path="/events/new" element={<EventFormPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/account/delete" element={<AccountDeletion />} />
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