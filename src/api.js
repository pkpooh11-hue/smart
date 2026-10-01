const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");

export const API_BASE = import.meta.env.DEV
  ? ""
  : configuredApiBase || "https://arcade-thick-remainder-bras.trycloudflare.com";
