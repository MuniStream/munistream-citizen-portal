export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  document_number?: string;
  status: string;
  email_verified: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  document_number?: string;
}

export interface AuthResponse {
  customer: User;
  access_token: string;
  token_type: string;
  message: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}