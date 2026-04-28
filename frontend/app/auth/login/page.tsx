"use client";

import AuthBackground from "../../../components/auth/AuthBackground";
import AuthCard from "../../../components/auth/AuthCard";
import "../../../components/auth/auth.css";

export default function LoginPage() {
  return (
    <div className="auth-root">
      <AuthBackground />
      <AuthCard
        title="Войти"
        submitText="Войти"
        footerText="Создать аккаунт"
        footerLink="/auth/registration"
      />
    </div>
  );
}
