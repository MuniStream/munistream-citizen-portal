import React, { useState } from 'react';
import { authService } from '../../services/authService';

interface PasswordResetFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const PasswordResetForm: React.FC<PasswordResetFormProps> = ({
  onSuccess,
  onSwitchToLogin
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await authService.requestPasswordReset({ email });
      setIsSuccess(true);
      onSuccess?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Password reset request failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="auth-form">
        <h2>Check Your Email</h2>
        <div className="success-message">
          <p>
            We've sent password reset instructions to <strong>{email}</strong>
          </p>
          <p>
            Please check your email and follow the link to reset your password.
          </p>
        </div>
        
        <div className="auth-links">
          <button 
            type="button" 
            className="link-button"
            onClick={onSwitchToLogin}
          >
            Return to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <h2>Reset Password</h2>
      <p>Enter your email address and we'll send you a link to reset your password</p>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            required
            disabled={isLoading}
            placeholder="Enter your email address"
          />
        </div>

        <button 
          type="submit" 
          className="btn-primary full-width"
          disabled={isLoading || !email.trim()}
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <div className="auth-links">
        <button 
          type="button" 
          className="link-button"
          onClick={onSwitchToLogin}
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
};