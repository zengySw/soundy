// frontend/app/auth/components/AuthCard.tsx   ← заменить файл полностью

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

interface AuthCardProps {
  title: string;
  submitText: string;
  footerText: string;
  footerLink: string;
}

export default function AuthCard({ title, submitText, footerText, footerLink }: AuthCardProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogin = title === "Войти";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = isLogin 
      ? { email, password }
      : { username, email, password };

    try {
      const res = await apiFetch(`/auth/${isLogin ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Ошибка на сервере");
      }

      if (!isLogin) {
        const loginRes = await apiFetch("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) {
          throw new Error(loginData.message || "Не удалось войти после регистрации");
        }
      }

      // Переходим на главную (или куда нужно после авторизации)
      router.push("/");

    } catch (err: any) {
      setError(err.message || "Не удалось подключиться к серверу");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card ">
      <h1>{title}</h1>

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value.trim())}
            required
            autoComplete="username"
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value.trim())}
          required
          autoComplete="email"
        />

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete={isLogin ? "current-password" : "new-password"}
        />

        {error && <p style={{ color: "#f87171", marginTop: "12px", fontSize: "14px" }}>{error}</p>}

        <button 
          className="primary" 
          type="submit"
          disabled={loading}
        >
          {loading ? "Загрузка..." : submitText}
        </button>
      </form>

      <div className="auth-footer">
        <span onClick={() => router.push(footerLink)}>{footerText}</span>
      </div>
    </div>
  );
}
