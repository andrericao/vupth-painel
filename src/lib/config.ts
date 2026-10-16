// Render = teste (staging); Railway = produção. Os mesmos hosts dos apps (vupth-partner/src/lib/api.ts).
export const API_URLS: Record<string, string> = {
  local: "http://localhost:8080",
  staging: "https://vupth-backend-ia.onrender.com",
  prod: "https://vupth-backend-ia-production.up.railway.app",
};

/** O ambiente vem do build (EXPO_PUBLIC_API_ENV); sem ele, ou com um nome que não existe, é o staging. */
export function apiBaseUrl(env: string | undefined = process.env.EXPO_PUBLIC_API_ENV): string {
  return API_URLS[env ?? ""] ?? API_URLS.staging;
}

/** Sessão do admin: 15 minutos (proposta do ADM-1, BAK painel-de-monitoramento). */
export const SESSAO_MS = 15 * 60 * 1000;
