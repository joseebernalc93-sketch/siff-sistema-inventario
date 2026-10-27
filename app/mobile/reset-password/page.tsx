"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

type SessionState = "loading" | "ready" | "error" | "success";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export default function MobileResetPasswordPage() {
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [accessToken, setAccessToken] = useState("");
  const [resetRequest, setResetRequest] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("Validando enlace de recuperacion...");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadRecoverySession() {
      if (!supabaseUrl || !supabaseAnonKey) {
        setSessionState("error");
        setMessage("Supabase no esta configurado para recuperar contrasenas.");
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const currentUrl = new URL(window.location.href);
      const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ""));
      const hashAccessToken = hashParams.get("access_token");
      const hashRefreshToken = hashParams.get("refresh_token");
      const authErrorCode =
        hashParams.get("error_code") ?? currentUrl.searchParams.get("error_code");
      const authErrorDescription =
        hashParams.get("error_description") ??
        currentUrl.searchParams.get("error_description");
      const code = currentUrl.searchParams.get("code");
      const recoveryRequest = currentUrl.searchParams.get("reset_request") ?? "";

      try {
        if (authErrorCode) {
          throw new Error(
            authErrorCode === "otp_expired"
              ? "El enlace expiro, ya fue usado o no es valido. Solicita uno nuevo desde la app."
              : authErrorDescription?.replaceAll("+", " ") ??
                  "No se pudo validar el enlace de recuperacion.",
          );
        }

        if (!recoveryRequest) {
          throw new Error(
            "Este enlace no tiene token de seguridad. Solicita uno nuevo desde la app.",
          );
        }

        if (hashAccessToken && hashRefreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });

          if (error || !data.session) {
            throw error ?? new Error("Sesion de recuperacion no encontrada.");
          }

          if (!active) return;
          setAccessToken(data.session.access_token);
          setResetRequest(recoveryRequest);
          setSessionState("ready");
          setMessage("Escribe tu nueva contrasena.");
          window.history.replaceState(null, "", currentUrl.pathname);
          return;
        }

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error || !data.session) {
            throw error ?? new Error("Sesion de recuperacion no encontrada.");
          }

          if (!active) return;
          setAccessToken(data.session.access_token);
          setResetRequest(recoveryRequest);
          setSessionState("ready");
          setMessage("Escribe tu nueva contrasena.");
          window.history.replaceState(null, "", currentUrl.pathname);
          return;
        }

        const { data } = await supabase.auth.getSession();

        if (!data.session) {
          throw new Error("El enlace de recuperacion expiro o no es valido.");
        }

        if (!active) return;
        setAccessToken(data.session.access_token);
        setResetRequest(recoveryRequest);
        setSessionState("ready");
        setMessage("Escribe tu nueva contrasena.");
      } catch (error) {
        if (!active) return;
        setSessionState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "El enlace de recuperacion expiro o no es valido.",
        );
      }
    }

    loadRecoverySession();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validatePassword(password, confirmPassword);
    if (validation) {
      setMessage(validation);
      setSessionState("ready");
      return;
    }

    setSubmitting(true);
    setMessage("Actualizando contrasena...");

    try {
      const response = await fetch("/api/mobile/clients/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
          password,
          reset_request: resetRequest,
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar la contrasena.");
      }

      setPassword("");
      setConfirmPassword("");
      setSessionState("success");
      setMessage(data.message ?? "Contrasena actualizada.");
      if (supabaseUrl && supabaseAnonKey) {
        await createClient(supabaseUrl, supabaseAnonKey).auth.signOut();
      }
    } catch (error) {
      setSessionState("ready");
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la contrasena.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isReady = sessionState === "ready";
  const isLoading = sessionState === "loading";
  const isSuccess = sessionState === "success";
  const isError = sessionState === "error";
  const strength = getPasswordStrength(password);

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="surface grid w-full max-w-md gap-6 p-6 sm:p-8">
        <div className="grid gap-3">
          <span className="brand-mark h-14 w-14">
            <KeyRound size={28} />
          </span>
          <div>
            <p className="badge badge-yellow mb-3">Minimarket IA</p>
            <h1 className="text-3xl font-black leading-none text-[var(--ink)]">
              Nueva contrasena
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Esta clave sera la que usaras para entrar de nuevo desde la app
              movil.
            </p>
          </div>
        </div>

        <div
          className={`flex items-start gap-3 rounded-lg border p-3 text-sm font-bold ${
            isSuccess
              ? "border-green-200 bg-green-50 text-green-800"
              : isError
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-[var(--line)] bg-[var(--accent-soft)] text-[var(--accent-deep)]"
          }`}
        >
          {isLoading ? (
            <Loader2 className="mt-0.5 animate-spin" size={18} />
          ) : isSuccess ? (
            <CheckCircle2 className="mt-0.5" size={18} />
          ) : (
            <AlertCircle className="mt-0.5" size={18} />
          )}
          <span>{message}</span>
        </div>

        {isReady ? (
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="field">
              <span className="label">Nueva contrasena</span>
              <span className="password-control">
                <input
                  className="input"
                  minLength={8}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={
                    showPassword
                      ? "Ocultar nueva contrasena"
                      : "Ver nueva contrasena"
                  }
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            <PasswordStrengthMeter strength={strength} />

            <label className="field">
              <span className="label">Confirmar contrasena</span>
              <span className="password-control">
                <input
                  className="input"
                  minLength={8}
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={
                    showConfirmPassword
                      ? "Ocultar confirmacion"
                      : "Ver confirmacion"
                  }
                  onClick={() => setShowConfirmPassword((value) => !value)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            <button className="btn btn-primary min-h-12" disabled={submitting}>
              {submitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <KeyRound size={18} />
              )}
              Guardar contrasena
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}

function validatePassword(password: string, confirmPassword: string) {
  if (password.length < 8) {
    return "Usa minimo 8 caracteres.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Agrega al menos una mayuscula.";
  }

  if (!/\d/.test(password)) {
    return "Agrega al menos un numero.";
  }

  if (password !== confirmPassword) {
    return "Las contrasenas no coinciden.";
  }

  return "";
}

function PasswordStrengthMeter({
  strength,
}: {
  strength: ReturnType<typeof getPasswordStrength>;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-[var(--line)] bg-white/70 p-3">
      <div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#ffe1e8]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${strength.percent}%`,
              backgroundColor: strength.color,
            }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs font-black">
          <span style={{ color: strength.color }}>{strength.label}</span>
          <span className="text-[var(--muted)]">Minimo 8, mayuscula y numeros</span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {strength.rules.map((rule) => (
          <span
            key={rule.label}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-extrabold ${
              rule.complete
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-[var(--line)] bg-[#fff4f7] text-[var(--muted)]"
            }`}
          >
            <CheckCircle2 size={14} />
            {rule.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function getPasswordStrength(password: string) {
  const rules = [
    {
      label: "8 caracteres",
      complete: password.length >= 8,
    },
    {
      label: "1 mayuscula",
      complete: /[A-Z]/.test(password),
    },
    {
      label: "Numeros",
      complete: /\d/.test(password),
    },
  ];
  const score = rules.filter((rule) => rule.complete).length;

  if (!password) {
    return {
      label: "Esperando contrasena",
      percent: 8,
      color: "#6e5f68",
      rules,
    };
  }

  if (score <= 1) {
    return {
      label: "No segura",
      percent: 32,
      color: "#d32f2f",
      rules,
    };
  }

  if (score === 2) {
    return {
      label: "Casi lista",
      percent: 68,
      color: "#f57c00",
      rules,
    };
  }

  return {
    label: "Segura",
    percent: 100,
    color: "#2e7d32",
    rules,
  };
}
