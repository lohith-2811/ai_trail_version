import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, CircularProgress, Alert } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
// --- 1. Import new methods ---
import { signInWithEmailAndPassword, signOut, sendEmailVerification, reload } from 'firebase/auth';

export default function VerifyEmail() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // --- 2. Add state for user feedback and cooldowns ---
  const [info, setInfo] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();

  // Cooldown timer effect for the resend button
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);


  useEffect(() => {
    const stateEmail = location.state?.email || '';
    const statePassword = location.state?.password || '';
    setEmail(stateEmail);
    setPassword(statePassword);

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // --- 3. Reload user data to get the latest emailVerified status ---
        await user.reload();
        setIsVerified(user.emailVerified);
        setEmail((prev) => prev || user.email || '');
        setLoading(false);
      } else {
        navigate('/login', { replace: true });
      }
    });

    return () => unsubscribe();
  }, [navigate, location.state]);

  const handleLogin = async () => { /* ... (no changes needed here) ... */ };

  const handleBackToLogin = async () => {
    setLoading(true); setError(''); setInfo('');
    try {
      await signOut(auth);
    } catch (err) {
      setError("An error occurred while trying to return to the login page.");
      setLoading(false);
    }
  };

  // --- 4. Handler to resend the verification email ---
  const handleResendVerification = async () => {
    setLoading(true); setError(''); setInfo('');
    const user = auth.currentUser;
    if (user) {
      try {
        await sendEmailVerification(user);
        setInfo('A new verification email has been sent. Please check your inbox.');
        setResendCooldown(60); // Set a 60-second cooldown
      } catch (err) {
        setError('Failed to send verification email. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
  };

  // --- 5. Handler to check verification status again ---
  const handleRefreshStatus = async () => {
    setLoading(true); setError(''); setInfo('');
    const user = auth.currentUser;
    if (user) {
      try {
        await reload(user);
        if (user.emailVerified) {
          setIsVerified(true);
          setInfo('Email successfully verified!');
        } else {
          setError('Email is still not verified. Please check your inbox or try resending the email.');
        }
      } catch (err) {
         setError('Failed to refresh status. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#111827', color: '#fff', p: 2 }}>
      <Typography variant="h4" gutterBottom>Email Verification</Typography>
      <Box sx={{ width: '100%', maxWidth: 400, bgcolor: '#1f2937', p: 4, borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {isVerified ? (
              <>
                <Typography variant="body2" sx={{ mb: 2, color: 'lightgreen' }}>
                  Your email is verified! Enter your password to sign in.
                </Typography>
                {/* ... The verified login form ... */}
              </>
            ) : (
              // --- 6. Updated UI for the unverified state ---
              <>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  A verification link has been sent to your email: <strong>{email}</strong>
                </Typography>
                <Typography variant="body2" sx={{ mb: 3, color: 'lightcoral' }}>
                  Please click the link to verify your account. Check your spam folder if you can't find it.
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleRefreshStatus}
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  I've Verified, Continue
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleResendVerification}
                  disabled={loading || resendCooldown > 0}
                  sx={{ mt: 2, color: 'white', borderColor: 'rgba(255, 255, 255, 0.23)' }}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
                </Button>
              </>
            )}
             <Button
                fullWidth
                variant="text"
                onClick={handleBackToLogin}
                disabled={loading}
                sx={{ mt: 2, color: 'grey' }}
              >
                Back to Login
              </Button>
          </>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {info && <Alert severity="info" sx={{ mt: 2 }}>{info}</Alert>}
      </Box>
    </Box>
  );
}