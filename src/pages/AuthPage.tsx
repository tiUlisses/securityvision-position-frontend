// src/pages/AuthPage.tsx
import { FormEvent, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

type Mode = "login" | "signup";

const AuthPage: React.FC = () => {
  const { login, signup, user } = useAuth();
  const [mode, setMode] = useState<Mode>("login");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const fromPath = useMemo(() => {
    const state = location.state as any;
    return state?.from?.pathname || "/";
  }, [location.state]);

  // se já estiver logado e entrar em /auth, manda pro app
  if (user) {
    navigate(fromPath, { replace: true });
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || (mode === "signup" && !fullName)) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await signup({ fullName, email, password });
      }

      navigate(fromPath, { replace: true });
    } catch (err: any) {
      setError(
        err?.message ??
          "Falha ao autenticar. Verifique os dados e tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = (newMode: Mode) => {
    setMode(newMode);
    setError(null);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-50">
            SecurityVision Position
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Acesse o painel de rastreamento e gestão de incidentes.
          </p>
        </div>

        <div className="mb-4 flex rounded-full bg-slate-800 p-1 text-xs">
          <button
            type="button"
            onClick={() => toggleMode("login")}
            className={`flex-1 rounded-full px-3 py-1.5 transition ${
              mode === "login"
                ? "bg-slate-50 text-slate-900 font-semibold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => toggleMode("signup")}
            className={`flex-1 rounded-full px-3 py-1.5 transition ${
              mode === "signup"
                ? "bg-slate-50 text-slate-900 font-semibold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Criar conta
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-md bg-rose-500/10 border border-rose-500/40 px-3 py-2 text-xs text-rose-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nome completo
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex.: Ulisses Rocha"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              E-mail
            </label>
            <input
              type="email"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@empresa.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Senha
            </label>
            <input
              type="password"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "••••••••"}
            />
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Confirmar senha
              </label>
              <input
                type="password"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? mode === "login"
                ? "Entrando..."
                : "Criando conta..."
              : mode === "login"
              ? "Entrar"
              : "Criar conta"}
          </button>
        </form>

        {mode === "login" && (
          <p className="mt-4 text-[11px] text-slate-500 text-center">
            Ainda não tem acesso?{" "}
            <button
              type="button"
              onClick={() => toggleMode("signup")}
              className="text-sky-400 hover:text-sky-300 font-medium"
            >
              Crie uma conta
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
