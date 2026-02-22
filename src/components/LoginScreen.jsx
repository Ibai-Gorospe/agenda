import { useState } from "react";
import { supabase } from "../supabase";
import { T } from "../theme";

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "registro" | "reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    if (mode === "reset") {
      if (!email.trim()) { setError("Introduce tu email"); return; }
      setLoading(true); setError("");
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (err) { setError(err.message); setLoading(false); return; }
      setResetSent(true);
      setLoading(false);
      return;
    }
    if (!email.trim() || !password.trim()) { setError("Rellena todos los campos"); return; }
    setLoading(true); setError("");
    if (mode === "login") {
      const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) { setError("Email o contraseña incorrectos"); setLoading(false); return; }
      onLogin(data.user);
    } else {
      const { data, error: e } = await supabase.auth.signUp({ email, password });
      if (e) { setError(e.message); setLoading(false); return; }
      onLogin(data.user);
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%", padding: ".85rem 1rem", marginBottom: ".85rem",
    background: T.bg, border: `1.5px solid ${T.borderGray}`,
    borderRadius: "12px", color: T.text, fontSize: "1rem", outline: "none",
    transition: "border-color .15s",
  };

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: `linear-gradient(160deg, #fef9ec 0%, #fdf3d0 50%, #fef6e4 100%)`,
      padding: "2rem",
    }}>
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div style={{
          width: "72px", height: "72px", borderRadius: "22px",
          background: T.accentGrad, display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 1rem",
          boxShadow: "0 8px 24px rgba(240,180,41,.35)",
        }}>
          <span style={{ fontSize: "2rem" }}>📅</span>
        </div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 700, color: T.text, fontFamily: T.font, margin: 0 }}>Agenda</h1>
        <p style={{ color: T.textMuted, fontSize: ".88rem", marginTop: ".3rem" }}>Tu tiempo, tu orden</p>
      </div>

      <div style={{
        background: T.bgCard, borderRadius: "24px", padding: "2rem",
        width: "100%", maxWidth: "380px",
        boxShadow: "0 4px 32px rgba(0,0,0,.1)",
      }}>
        {mode === "reset" ? (
          <>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: T.text, marginBottom: ".5rem" }}>
              Recuperar contraseña
            </h3>
            {resetSent ? (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <p style={{ color: T.textSub, fontSize: ".9rem", lineHeight: 1.5, marginBottom: "1rem" }}>
                  Se ha enviado un enlace a <strong>{email}</strong>. Revisa tu bandeja de entrada.
                </p>
                <button onClick={() => { setMode("login"); setResetSent(false); setError(""); }} style={{
                  background: T.bg, border: "none", borderRadius: "10px",
                  color: T.accentDark, padding: ".6rem 1.2rem", cursor: "pointer",
                  fontWeight: 600, fontSize: ".88rem",
                }}>Volver al login</button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <p style={{ color: T.textMuted, fontSize: ".84rem", lineHeight: 1.4, marginBottom: "1rem" }}>
                  Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
                </p>
                <input type="email" placeholder="Email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  style={inputStyle} />
                {error && <p style={{ color: T.danger, fontSize: ".83rem", marginBottom: ".8rem", textAlign: "center" }}>{error}</p>}
                <button type="submit" disabled={loading} style={{
                  width: "100%", padding: ".9rem", background: T.accentGrad,
                  border: "none", borderRadius: "12px", color: T.textOnAccent,
                  fontWeight: 700, fontSize: "1rem", cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(240,180,41,.4)",
                  opacity: loading ? .75 : 1,
                }}>{loading ? "..." : "Enviar enlace"}</button>
                <button type="button" onClick={() => { setMode("login"); setError(""); }} style={{
                  width: "100%", marginTop: ".75rem", background: "none", border: "none",
                  color: T.textMuted, cursor: "pointer", fontSize: ".84rem",
                }}>Volver al login</button>
              </form>
            )}
          </>
        ) : (
          <>
            <div style={{
              display: "flex", background: T.bg, borderRadius: "12px",
              padding: "4px", marginBottom: "1.5rem", gap: "4px",
            }}>
              {["login", "registro"].map(m => (
                <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
                  flex: 1, padding: ".55rem", borderRadius: "9px", border: "none", cursor: "pointer",
                  background: mode === m ? T.bgCard : "transparent",
                  color: mode === m ? T.text : T.textMuted,
                  fontWeight: mode === m ? 600 : 400, fontSize: ".9rem",
                  boxShadow: mode === m ? T.shadowCard : "none",
                  transition: "all .2s",
                }}>{m === "login" ? "Iniciar sesión" : "Registro"}</button>
              ))}
            </div>

            <form onSubmit={submit}>
              <input type="email" placeholder="Email" value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                style={inputStyle} />
              <input type="password" placeholder="Contraseña" value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                style={{ ...inputStyle, marginBottom: error ? ".5rem" : "1.2rem" }} />

              {error && <p style={{ color: T.danger, fontSize: ".83rem", marginBottom: ".8rem", textAlign: "center" }}>{error}</p>}

              <button type="submit" disabled={loading} style={{
                width: "100%", padding: ".9rem", background: T.accentGrad,
                border: "none", borderRadius: "12px", color: T.textOnAccent,
                fontWeight: 700, fontSize: "1rem", cursor: "pointer",
                boxShadow: "0 4px 16px rgba(240,180,41,.4)", opacity: loading ? .75 : 1,
                transition: "opacity .15s",
              }}>{loading ? "..." : mode === "login" ? "Entrar" : "Crear cuenta"}</button>
            </form>

            {mode === "login" && (
              <button onClick={() => { setMode("reset"); setError(""); }} style={{
                width: "100%", marginTop: ".6rem", background: "none", border: "none",
                color: T.textMuted, cursor: "pointer", fontSize: ".82rem", padding: ".3rem",
              }}>¿Olvidaste tu contraseña?</button>
            )}

            <div style={{ textAlign: "center", marginTop: "1.4rem" }}>
              <div style={{ height: "1px", background: T.borderGray, marginBottom: "1.2rem" }} />
              <button onClick={() => onLogin({ id: "guest", email: "invitado", guest: true })} style={{
                background: "none", border: `1.5px solid ${T.borderGray}`,
                borderRadius: "12px", color: T.textSub, padding: ".75rem 1.5rem",
                width: "100%", cursor: "pointer", fontSize: ".9rem", fontWeight: 500,
              }}>Continuar sin cuenta</button>
              <p style={{ color: T.textMuted, fontSize: ".75rem", marginTop: ".5rem" }}>
                Las tareas no se guardarán entre sesiones
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
