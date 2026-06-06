/**
 * Password Change Component
 * Instagram-style UI with iOS-first responsive design
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { z } from 'zod';
import axios, { AxiosError } from 'axios';

// ============================================
// Types & Interfaces
// ============================================

type ViewState = 'FORM' | 'LOADING' | 'SUCCESS' | 'ERROR';

interface PasswordChangeForm {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

// ============================================
// Zod Validation Schema
// ============================================

// Base schema for individual field validation (no .refine, so .shape works)
const baseSchema = z.object({
  oldPassword: z
    .string()
    .min(1, 'Current password is required')
    .max(64, 'Password is too long')
    .refine((val) => !val.includes('\0'), 'Invalid characters in password'),
  
  newPassword: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(64, 'Password must be at most 64 characters')
    .refine((val) => !val.includes('\0'), 'Invalid characters in password')
    .refine((val) => !/^\d+$/.test(val), 'Password can\'t be all numbers')
    .refine((val) => !/^[a-z]+$/.test(val), 'Password can\'t be all lowercase letters')
    .refine(
      (val) => !['password', '123456', 'qwerty', 'abc123', 'letmein', 'welcome', 'monkey', '1234567890', 'password123', 'admin', 'login', 'master', 'passw0rd', 'hello123'].includes(val.toLowerCase()),
      'This password is too easy to guess. Choose a stronger password'
    ),
  
  confirmPassword: z.string(),
});

// Full schema for form validation (with cross-field checks)
const passwordSchema = baseSchema.refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => data.oldPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

// ============================================
// Axios Instance
// ============================================

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Generate idempotency key for POST requests
  if (config.method === 'post') {
    config.headers['X-Idempotency-Key'] = generateIdempotencyKey();
  }
  
  return config;
});

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: ApiError }>) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Generate idempotency key (UUID v4-like)
function generateIdempotencyKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================
// Main Component
// ============================================

const PasswordChange: React.FC = () => {
  // Form state
  const [form, setForm] = useState<PasswordChangeForm>({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  // UI state
  const [viewState, setViewState] = useState<ViewState>('FORM');
  const [showPassword, setShowPassword] = useState({
    old: false,
    new: false,
    confirm: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordChangeForm, string>>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  // Refs for input focus
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  
  // Debounce timer
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // ============================================
  // Form Validation
  // ============================================
  
  const validateField = useCallback((field: keyof PasswordChangeForm, value: string) => {
    const fieldSchema = baseSchema.shape[field];
    const result = fieldSchema.safeParse(value);
    
    if (!result.success) {
      setErrors((prev) => ({
        ...prev,
        [field]: result.error.errors[0].message,
      }));
      return false;
    }
    
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    return true;
  }, []);
  
  const validateForm = useCallback((): boolean => {
    const result = passwordSchema.safeParse(form);
    
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.errors.forEach((err) => {
        const path = err.path[0] as keyof PasswordChangeForm;
        if (!fieldErrors[path]) {
          fieldErrors[path] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
    
    setErrors({});
    return true;
  }, [form]);
  
  // ============================================
  // Event Handlers
  // ============================================
  
  const handleInputChange = (field: keyof PasswordChangeForm, value: string) => {
    // Normalize Unicode (NFC) to prevent spoofing
    const normalizedValue = value.normalize('NFC');
    
    setForm((prev) => ({ ...prev, [field]: normalizedValue }));
    setApiError(null);
    
    // Debounced validation
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      validateField(field, normalizedValue);
    }, 300);
  };
  
  const togglePasswordVisibility = (field: 'old' | 'new' | 'confirm') => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted', form);
    
    const isValid = validateForm();
    console.log('Form validation result:', isValid, errors);
    
    if (!isValid) {
      console.log('Validation failed, returning early');
      return;
    }
    
    console.log('Setting loading state...');
    setViewState('LOADING');
    setApiError(null);
    
    try {
      const response = await api.post('/auth/change-password', {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      
      // Store new token
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
      }
      
      console.log('Password change successful, opening Instagram app...');
      
      // Redirect to Instagram app only (no web fallback)
      const instagramUsername = 'by__mansi';
      const appUrl = `instagram://user?username=${instagramUsername}`;
      
      // Direct redirect to Instagram app
      window.location.href = appUrl;
    } catch (error) {
      console.log('API error caught:', error);
      const axiosError = error as AxiosError<{ error?: ApiError }>;
      const errorData = axiosError.response?.data?.error;
      console.log('Error data:', errorData, 'Status:', axiosError.response?.status);
      
      if (errorData) {
        switch (errorData.code) {
          case 'INVALID_PASSWORD':
            setApiError('Current password is incorrect');
            break;
          case 'PASSWORD_IN_HISTORY':
            setApiError('Cannot reuse a previous password');
            break;
          case 'RATE_LIMIT_EXCEEDED':
            setApiError('Too many attempts. Please try again later.');
            break;
          case 'SESSION_INVALIDATED':
            setApiError('Your session has expired. Please log in again.');
            break;
          case 'VALIDATION_ERROR':
            setApiError('Please check your input and try again.');
            break;
          default:
            setApiError(errorData.message || 'An error occurred. Please try again.');
        }
      } else {
        setApiError('Network error. Please check your connection and try again.');
      }
      
      setViewState('ERROR');
    }
  };
  
  const handleRetry = () => {
    setViewState('FORM');
    setApiError(null);
  };
  
  // ============================================
  // Effects
  // ============================================
  
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);
  
  // ============================================
  // Render Helpers
  // ============================================
  
  const isFormValid =
    form.oldPassword.length > 0 &&
    form.newPassword.length >= 6 &&
    form.newPassword === form.confirmPassword &&
    form.oldPassword !== form.newPassword;
  
  // ============================================
  // Styles (CSS-in-JS for single-file portability)
  // ============================================
  
  const styles: Record<string, React.CSSProperties> = {
    container: {
      minHeight: '-webkit-fill-available', // iOS Safari fix
      backgroundColor: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: '12vh', // Position slightly below top for iOS
      paddingLeft: '20px',
      paddingRight: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      WebkitFontSmoothing: 'antialiased',
    },
    card: {
      backgroundColor: '#ffffff',
      border: 'none',
      borderRadius: '0',
      padding: '0',
      width: '100%',
      maxWidth: '350px',
      boxSizing: 'border-box',
    },
    logo: {
      width: '96px',
      height: '96px',
      margin: '0 auto 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoImg: {
      width: '96px',
      height: '96px',
      objectFit: 'contain',
    },
    title: {
      fontSize: '20px',
      fontWeight: 600,
      color: '#262626',
      textAlign: 'center',
      margin: '0 0 24px 0',
    },
    subtitle: {
      fontSize: '14px',
      color: '#8e8e8e',
      textAlign: 'center',
      margin: '0 0 24px 0',
      lineHeight: 1.5,
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    inputGroup: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    },
    input: {
      width: '100%',
      padding: '12px 40px 12px 12px',
      border: '1px solid #dbdbdb',
      borderRadius: '4px',
      fontSize: '14px',
      backgroundColor: '#fafafa',
      outline: 'none',
      transition: 'border-color 0.2s',
      boxSizing: 'border-box',
      WebkitAppearance: 'none', // iOS input styling
    },
    inputFocus: {
      borderColor: '#a8a8a8',
    },
    inputError: {
      borderColor: '#ed4956',
    },
    toggleButton: {
      position: 'absolute',
      right: '12px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      color: '#8e8e8e',
      fontSize: '14px',
      fontWeight: 600,
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent', // iOS tap highlight
    },
    errorText: {
      fontSize: '12px',
      color: '#ed4956',
      marginTop: '4px',
      marginLeft: '4px',
    },
    submitButton: {
      backgroundColor: isFormValid ? '#0095f6' : '#b2dffc',
      color: '#ffffff',
      border: 'none',
      borderRadius: '4px',
      padding: '12px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: isFormValid ? 'pointer' : 'not-allowed',
      marginTop: '12px',
      transition: 'background-color 0.2s',
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation', // iOS fast tap
      minHeight: '44px', // iOS touch target
    },
    apiError: {
      backgroundColor: '#ffe6e6',
      border: '1px solid #ed4956',
      borderRadius: '4px',
      padding: '12px',
      marginBottom: '16px',
      fontSize: '14px',
      color: '#ed4956',
      textAlign: 'center',
    },
    // Loading state - Instagram style overlay
    loadingOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: '3px solid #dbdbdb',
      borderTopColor: '#0095f6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    // Success state
    successContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
    },
    checkmark: {
      width: '80px',
      height: '80px',
      backgroundColor: '#2ecc71',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '24px',
      animation: 'scaleIn 0.3s ease-out',
    },
    checkmarkSvg: {
      width: '40px',
      height: '40px',
      fill: 'white',
    },
    successTitle: {
      fontSize: '20px',
      fontWeight: 600,
      color: '#262626',
      marginBottom: '8px',
    },
    successMessage: {
      fontSize: '14px',
      color: '#8e8e8e',
      textAlign: 'center',
      marginBottom: '24px',
    },
    // Error state
    errorContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
    },
    errorIcon: {
      width: '64px',
      height: '64px',
      backgroundColor: '#ed4956',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '24px',
    },
    errorIconSvg: {
      width: '32px',
      height: '32px',
      fill: 'white',
    },
    retryButton: {
      backgroundColor: '#0095f6',
      color: '#ffffff',
      border: 'none',
      borderRadius: '4px',
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      marginTop: '16px',
      minHeight: '44px',
    },
  };
  
  // ============================================
  // Render
  // ============================================
  
  // Loading State - Instagram style overlay
  if (viewState === 'LOADING') {
    return (
      <div style={styles.container}>
        <div style={styles.loadingOverlay}>
          <div style={styles.spinner} />
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  // Success State - Instagram style, auto-redirects
  if (viewState === 'SUCCESS') {
    return (
      <div style={styles.container}>
        <div style={styles.successContainer}>
          <div style={styles.checkmark}>
            <svg style={styles.checkmarkSvg} viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
          <h2 style={styles.successTitle}>Password changed</h2>
          <p style={styles.successMessage}>
            Your password has been changed. Redirecting...
          </p>
        </div>
        <style>{`
          @keyframes scaleIn {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }
  
  // Error State - Instagram style without card
  if (viewState === 'ERROR') {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>
            <svg style={styles.errorIconSvg} viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </div>
          <h2 style={styles.title}>Something went wrong</h2>
          <p style={styles.subtitle}>{apiError}</p>
          <button style={styles.retryButton} onClick={handleRetry}>
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  // Form State (default)
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <img src="/logo.png" alt="Logo" style={styles.logoImg} />
        </div>
        
        <h1 style={styles.title}>Change Password</h1>
        
        {/* API Error */}
        {apiError && <div style={styles.apiError}>{apiError}</div>}
        
        <form style={styles.form} onSubmit={handleSubmit}>
          {/* Old Password */}
          <div>
            <div style={styles.inputGroup}>
              <input
                type={showPassword.old ? 'text' : 'password'}
                placeholder="Current Password"
                value={form.oldPassword}
                onChange={(e) => handleInputChange('oldPassword', e.target.value)}
                onBlur={(e) => validateField('oldPassword', e.target.value)}
                style={{
                  ...styles.input,
                  ...(errors.oldPassword ? styles.inputError : {}),
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                style={styles.toggleButton}
                onClick={() => togglePasswordVisibility('old')}
                tabIndex={-1}
              >
                {showPassword.old ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.oldPassword && (
              <span style={styles.errorText}>{errors.oldPassword}</span>
            )}
          </div>
          
          {/* New Password */}
          <div>
            <div style={styles.inputGroup}>
              <input
                ref={newPasswordRef}
                type={showPassword.new ? 'text' : 'password'}
                placeholder="New Password"
                value={form.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                onBlur={(e) => validateField('newPassword', e.target.value)}
                style={{
                  ...styles.input,
                  ...(errors.newPassword ? styles.inputError : {}),
                }}
                autoComplete="new-password"
              />
              <button
                type="button"
                style={styles.toggleButton}
                onClick={() => togglePasswordVisibility('new')}
                tabIndex={-1}
              >
                {showPassword.new ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.newPassword && (
              <span style={styles.errorText}>{errors.newPassword}</span>
            )}
            
          </div>
          
          {/* Confirm Password */}
          <div>
            <div style={styles.inputGroup}>
              <input
                ref={confirmPasswordRef}
                type={showPassword.confirm ? 'text' : 'password'}
                placeholder="Confirm New Password"
                value={form.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                onBlur={(e) => validateField('confirmPassword', e.target.value)}
                style={{
                  ...styles.input,
                  ...(errors.confirmPassword ? styles.inputError : {}),
                }}
                autoComplete="new-password"
              />
              <button
                type="button"
                style={styles.toggleButton}
                onClick={() => togglePasswordVisibility('confirm')}
                tabIndex={-1}
              >
                {showPassword.confirm ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.confirmPassword && (
              <span style={styles.errorText}>{errors.confirmPassword}</span>
            )}
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            style={styles.submitButton}
            disabled={!isFormValid}
          >
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordChange;
