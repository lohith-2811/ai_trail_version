import React, { useState } from 'react';
import { Box, Typography, Button, TextField, Tabs, Tab, CircularProgress, Alert } from '@mui/material';
import { GoogleAuthProvider, signInWithRedirect, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
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

  const handleGoogleSignIn = async () => {
    setLoading(true); setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault(); setLoading(true); setError(''); setInfo('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      setInfo('Account created! A verification email has been sent.');
      setEmail(''); // Clear form
      setPassword('');
      navigate('/verify-email', { state: { email, password } }); // Redirect to verify-email page
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault(); setLoading(true); setError(''); setInfo('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        await auth.signOut();
        setError('Please verify your email before signing in. A new verification email has been sent.');
        await sendEmailVerification(userCredential.user);
        navigate('/verify-email', { state: { email, password } });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#111827', color: '#fff', p: 2 }}>
      <Typography variant="h4" gutterBottom>Welcome to Jai AI</Typography>
      <Box sx={{ width: '100%', maxWidth: 400, bgcolor: '#1f2937', p: 4, borderRadius: 2 }}>
        <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} centered>
          <Tab label="Email" />
        </Tabs>

        {tab === 0 && (
          <Box component="form" onSubmit={handleEmailSignIn} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            />
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button type="submit" fullWidth variant="contained" disabled={loading}>
                Sign In
              </Button>
              <Button fullWidth variant="outlined" onClick={handleEmailSignUp} disabled={loading}>
                Sign Up
              </Button>
            </Box>
          </Box>
        )}
        
        <Button
          fullWidth
          variant="outlined"
          startIcon={<GoogleIcon />}
          onClick={handleGoogleSignIn}
          disabled={loading}
          sx={{ mt: 3, color: 'white', borderColor: 'rgba(255, 255, 255, 0.23)' }}
        >
          Sign in with Google
        </Button>
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
    </Box>
  );
}