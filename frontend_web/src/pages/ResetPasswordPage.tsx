import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import apiClient from '../utils/apiClient';
import { API_ENDPOINTS } from '../constants/api';
import AuthLayout from '../layouts/AuthLayout'; // Import the new layout

export default function ResetPasswordPage() {
  // --- All logic is unchanged ---
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate       = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiClient.post(API_ENDPOINTS.passwordResetConfirm, {
        uid,
        token,
        new_password1: newPassword,
        new_password2: confirmPassword,
      });
      navigate('/login');
    } catch {
      setError('Failed to reset password. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Set a New Password">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <TextField fullWidth margin="normal" label="New Password" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} InputProps={{ endAdornment: ( <InputAdornment position="end"> <IconButton onClick={() => setShowPassword((show) => !show)} edge="end"> {showPassword ? <VisibilityOff /> : <Visibility />} </IconButton> </InputAdornment> ), }} />
        <TextField fullWidth margin="normal" label="Confirm New Password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} InputProps={{ endAdornment: ( <InputAdornment position="end"> <IconButton onClick={() => setShowConfirmPassword((show) => !show)} edge="end"> {showConfirmPassword ? <VisibilityOff /> : <Visibility />} </IconButton> </InputAdornment> ), }} />
        <Button fullWidth type="submit" variant="contained" disabled={loading} sx={{ mt: 2, py: 1.5, backgroundColor: '#00a99d', '&:hover': {backgroundColor: '#00877d'} }}>
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
        </Button>
      </form>
    </AuthLayout>
  );
}