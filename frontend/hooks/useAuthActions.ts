"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { apiFetch } from "@/lib/api";

export function useAuthActions() {
  const router = useRouter();

  const goToLogin = useCallback(() => {
    router.replace("/auth/login");
  }, [router]);

  const goToRegister = useCallback(() => {
    router.replace("/auth/registration");
  }, [router]);

  const goToHome = useCallback(() => {
    router.replace("/");
  }, [router]);

  const goToSettings = useCallback(() => {
    router.push("/settings");
  }, [router]);

  const goToUserProfile = useCallback(
    (id: string) => {
      router.push(`/user/${id}`);
    },
    [router],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
      });
    } catch {
      // ignore
    }
    router.replace("/auth/login");
  }, [router]);

  return {
    goToLogin,
    goToRegister,
    goToHome,
    goToSettings,
    goToUserProfile,
    logout,
  };
}
