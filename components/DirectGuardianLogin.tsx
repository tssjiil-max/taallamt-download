"use client";

import { useEffect } from "react";
import { guardianLogin } from "@/lib/guardian-api";

export function DirectGuardianLogin() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const studentId = params.get("student")?.trim() ?? "";
    const token = params.get("token")?.trim() ?? "";
    if (!studentId || !token) return;

    let active = true;
    guardianLogin(studentId, token)
      .then(() => {
        if (!active) return;
        window.location.replace("/guardian");
      })
      .catch(() => {
        if (!active) return;
        const clean = new URL(window.location.href);
        clean.searchParams.delete("token");
        window.history.replaceState({}, "", clean.toString());
      });

    return () => {
      active = false;
    };
  }, []);

  return null;
}
