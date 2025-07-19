import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import VerifyEmail from './components/VerifyEmail';
import ChatBox from './components/ChatBox';
import { Box } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#111827', color: '#fff' }}>
        Loading...
      </Box>
    );
  }
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  // Check if the user signed in with email/password and if email is verified
  if (currentUser.providerData.some(provider => provider.providerId === 'password') && !currentUser.emailVerified) {
    return <Navigate to="/verify-email" state={{ email: currentUser.email }} />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#111827', color: '#fff' }}>
        Loading...
      </Box>
    );
  }
  // Redirect to / if user is signed in and either verified (for email/password) or using Google
  if (currentUser) {
    if (currentUser.providerData.some(provider => provider.providerId === 'password') && !currentUser.emailVerified) {
      return <Navigate to="/verify-email" state={{ email: currentUser.email }} />;
    }
    return <Navigate to="/" />;
  }
  return children;
}

function VerifyEmailRoute() {
  const { currentUser, loading } = useAuth();
  const { state } = useLocation();
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#111827', color: '#fff' }}>
        Loading...
      </Box>
    );
  }
  if (!currentUser && !state?.email) {
    return <Navigate to="/login" />;
  }
  if (currentUser && currentUser.providerData.some(provider => provider.providerId === 'password') && currentUser.emailVerified) {
    return <Navigate to="/" />;
  }
  return <VerifyEmail />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/verify-email" element={<VerifyEmailRoute />} />
          <Route path="/" element={<ProtectedRoute><ChatBox /></ProtectedRoute>} />
          <Route
            path="*"
            element={
              <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#111827', color: '#fff' }}>
                404 - Page Not Found
              </Box>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;