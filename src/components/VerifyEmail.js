import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { sendEmailVerification, getIdToken, signOut } from 'firebase/auth';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function VerifyEmail() {
  const { state } = useLocation();
  const email = state?.email || 'your email';
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResendEmail = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('No user is signed in. Please sign up or log in again.');
        navigate('/login', { replace: true });
        return;
      }

      const token = await getIdToken(user);
      await axios.post(`${API_BASE_URL}/auth/resend-verification`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await sendEmailVerification(user);
      setMessage('Verification email sent! Check your inbox or spam folder.');
      setCooldown(60);
    } catch (err) {
      if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes before trying again.');
        setCooldown(60);
      } else {
        setError(err.response?.data?.error || err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setError('');
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          navigate('/', { replace: true });
        } else {
          setError('Email not verified yet. Please check your email.');
        }
      } else {
        setError('No user is signed in. Please log in.');
        navigate('/login', { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth); // Sign out the user to clear session
      }
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Error signing out:', err);
      navigate('/login', { replace: true }); // Navigate even if sign-out fails
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#111827', color: '#fff', p: 2 }}>
      <Typography variant="h4" gutterBottom>Verify Your Email</Typography>
      <Box sx={{ width: '100%', maxWidth: 400, bgcolor: '#1f2937', p: 4, borderRadius: 2 }}>
        <Typography sx={{ textAlign: 'center', mb: 2 }}>
          A verification email has been sent to {email}. Please verify your email to continue.
        </Typography>
        {message && <Alert severity="info" sx={{ mt: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{error}</Alert>}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress />
          </Box>
        )}
        <Button
          onClick={handleResendEmail}
          disabled={loading || cooldown > 0}
          variant="contained"
          fullWidth
          sx={{ mt: 2, bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
        >
          {cooldown > 0 ? `Wait ${cooldown}s` : (loading ? 'Processing...' : 'Resend Verification Email')}
        </Button>
        <Button
          onClick={handleCheckVerification}
          disabled={loading}
          variant="contained"
          fullWidth
          sx={{ mt: 2, bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' } }}
        >
          {loading ? 'Checking...' : 'I’ve Verified My Email'}
        </Button>
        <Button
          onClick={handleBackToLogin}
          disabled={loading}
          variant="outlined"
          fullWidth
          sx={{ mt: 2, color: 'white', borderColor: 'rgba(255, 255, 255, 0.23)', '&:hover': { borderColor: '#fff' } }}
        >
          Back to Login
        </Button>
      </Box>
    </Box>
  );
}

export default VerifyEmail;