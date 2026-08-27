import { useEffect, useState } from "react";

/**
 * SSR-safe session token accessor.
 * Returns "" during SSR/first paint, then the real token after mount.
 * Prevents `localStorage is not defined` crashes on direct-URL visits.
 */
export function useSessionToken(): string {
  const [token, setToken] = useState("");
  useEffect(() => {
    setToken(localStorage.getItem("oookea_session") || "");
  }, []);
  return token;
}
