"use client";

import AuthBackground from "../../../components/auth/AuthBackground";
import AuthCard from "../../../components/auth/AuthCard";
import "../../../components/auth/auth.css";

export default function RegistrationPage() {
  return (
    <div className="auth-root">
      <AuthBackground />
      <AuthCard
        title="Создать аккаунт"
        submitText="Регистрация"
        footerText="Уже есть аккаунт? Войти"
        footerLink="/auth/login"
      />
    </div>
  );
}
