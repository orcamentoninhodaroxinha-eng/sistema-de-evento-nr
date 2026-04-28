export function useLoginUser() {
  try {
    const raw = sessionStorage.getItem("ninho_auth");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}