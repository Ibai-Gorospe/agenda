import { Component } from "react";
import { T } from "../theme";
import { AlertTriangle } from "lucide-react";

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          textAlign: "center", padding: "3rem 1.5rem",
          background: T.bgCard, borderRadius: T.r4,
          margin: "1.25rem 1rem", boxShadow: T.shadowCard,
        }}>
          <AlertTriangle size={40} style={{ color: T.danger, marginBottom: ".6rem" }} />
          <h3 style={{ color: T.text, fontSize: "1rem", margin: "0 0 .4rem" }}>
            Algo salió mal
          </h3>
          <p style={{ color: T.textMuted, fontSize: ".85rem", marginBottom: "1rem" }}>
            Ha ocurrido un error inesperado.
          </p>
          <button onClick={this.handleRetry} style={{
            background: T.accentGrad, border: "none", borderRadius: T.r3,
            color: T.textOnAccent, padding: ".6rem 1.5rem",
            fontWeight: 600, fontSize: ".88rem", cursor: "pointer",
          }}>Reintentar</button>
        </div>
      );
    }
    return this.props.children;
  }
}
