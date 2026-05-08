import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

const USERS = [
  { username: "Ninho", password: "123", role: "admin" },
  { username: "Juberly", password: "123", role: "cozinha" },
  { username: "AndreF", password: "123", role: "salao" },
  { username: "AndreM", password: "123", role: "aprovador" },
];
const SESSION_KEY = "ninho_auth";

const getStorage = () => {
  try {
    localStorage.setItem("__test__", "1");
    localStorage.removeItem("__test__");
    return localStorage;
  } catch {
    return sessionStorage;
  }
};

export default function LoginGate({ children }) {
  const [authed, setAuthed] = useState(() => {
    try { return !!getStorage().getItem(SESSION_KEY); } catch { return false; }
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    const found = USERS.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password.trim());
    if (found) {
      try { getStorage().setItem(SESSION_KEY, JSON.stringify({ username: found.username, role: found.role })); } catch {}
      setAuthed(true);
    } else {
      setError("Usuário ou senha incorretos.");
    }
  };

  if (authed) return children;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg mb-4">
            <img
              src="https://media.base44.com/images/public/69cbd80727489d185bf14962/525f1e0b3_generated_image.png"
              alt="Ninho da Roxinha"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Ninho da Roxinha</h1>
          <p className="text-sm text-muted-foreground mt-1">Sistema de Confirmação de Evento</p>
          <div className="flex items-center justify-center gap-3 mt-3 text-xs text-primary/70">
            <span>🌐 Web</span>
            <span className="text-muted-foreground/50">•</span>
            <span>📱 Mobile</span>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Entrar</h2>
          </div>

          <div className="space-y-1.5">
            <Label>Usuário</Label>
            <Input
              placeholder="Digite seu usuário"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Senha</Label>
            <Input
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleLogin} className="w-full h-11 font-semibold rounded-xl">
            Entrar
          </Button>
        </div>
      </div>
    </div>
  );
}