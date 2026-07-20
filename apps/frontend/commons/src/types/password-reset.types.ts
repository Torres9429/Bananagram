export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string; // UUID enviado por correo — esto es lo que viaja en el link
  expiresAt: string;
  usedAt?: string | null;
  createdAt: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

// token = PasswordResetToken.token (el UUID de la URL), no el JWT de sesión.
export interface ResetPasswordRequest {
  token: string;
  password: string;
}
