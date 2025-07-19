import React, { useState } from 'react';
import { Box, Typography, Button, TextField, Tabs, Tab, CircularProgress, Alert } from '@mui/material';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import GoogleIcon from '@mui/icons-material/Google';

export default function LoginPage() {
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const navigate = useNavigate();

  const handleGoogleSignIn = async (isSignup = false) => {
    setLoading(true);
    setError('');
    setInfo('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (isSignup) {
        setInfo(result._tokenResponse.isNewUser ? 'New account created with Google!' : 'Signed in with existing Google account.');
      }
      navigate('/'); // Google Sign-In doesn't require email verification
    } catch (err) {
      setError(err.code === 'auth/popup-closed-by-user' ? 'Google Sign-In was cancelled.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      setInfo('Account created! A verification email has been sent.');
      setEmail('');
      setPassword('');
      navigate('/verify-email', { state: { email } }); // Always navigate to verify-email after signup
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        await sendEmailVerification(userCredential.user); // Resend verification email
        setError('Please verify your email before signing in. A new verification email has been sent.');
        navigate('/verify-email', { state: { email } });
      } else {
        navigate('/'); // Navigate to ChatBox only if email is verified
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoClick = () => {
    window.location.href = 'https://jairisys.tech';
  };

  const handleFooterClick = () => {
    window.location.href = 'https://jairisys.tech';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#111827', color: '#fff', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }} onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
        <img src="https://jairisys.tech/ic_logo_main.png" alt="Jairisys Logo" style={{ height: '70px', marginRight: '-18px', marginTop: '-16px', }} />
        <Typography variant="h4" gutterBottom sx={{ color: '#64ffda' }}>airisys</Typography>
      </Box>
      <Box sx={{ width: '100%', maxWidth: 400, bgcolor: '#1f2937', p: 4, borderRadius: 2 }}>
        <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} centered>
          <Tab label="Sign In" />
          <Tab label="Sign Up" />
        </Tabs>

        {tab === 0 && (
          <Box component="form" onSubmit={handleEmailSignIn} sx={{ mt: 2 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{ style: { color: '#fff', backgroundColor: '#374151', borderColor: 'rgba(255, 255, 255, 0.23)' } }}
              InputLabelProps={{ style: { color: '#9ca3af' } }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{ style: { color: '#fff', backgroundColor: '#374151', borderColor: 'rgba(255, 255, 255, 0.23)' } }}
              InputLabelProps={{ style: { color: '#9ca3af' } }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ mt: 2, bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
            >
              Sign In
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={() => handleGoogleSignIn(false)}
              disabled={loading}
              sx={{ mt: 2, color: 'white', borderColor: 'rgba(255, 255, 255, 0.23)', '&:hover': { borderColor: '#fff' } }}
            >
              Sign In with Google
            </Button>
          </Box>
        )}

        {tab === 1 && (
          <Box component="form" onSubmit={handleEmailSignUp} sx={{ mt: 2 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{ style: { color: '#fff', backgroundColor: '#374151', borderColor: 'rgba(255, 255, 255, 0.23)' } }}
              InputLabelProps={{ style: { color: '#9ca3af' } }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{ style: { color: '#fff', backgroundColor: '#374151', borderColor: 'rgba(255, 255, 255, 0.23)' } }}
              InputLabelProps={{ style: { color: '#9ca3af' } }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ mt: 2, bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
            >
              Sign Up
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={() => handleGoogleSignIn(true)}
              disabled={loading}
              sx={{ mt: 2, color: 'white', borderColor: 'rgba(255, 255, 255, 0.23)', '&:hover': { borderColor: '#fff' } }}
            >
              Sign Up with Google
            </Button>
          </Box>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
            {error}
          </Alert>
        )}
        {info && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {info}
          </Alert>
        )}
      </Box>
      <Typography variant="caption" sx={{ mt: 4, textAlign: 'center', color: '#9ca3af' }}>
        Crafted with <span style={{ color: '#ff4d4d' }}>❤️</span> by{' '}
        <a href="https://jairisys.tech" target="_blank" rel="noopener noreferrer" style={{ color: '#64ffda' }}>
          jairisys.tech
        </a>
      </Typography>
    </Box>
  );
}