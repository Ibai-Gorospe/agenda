// ─── Theme: warm cream + golden yellow, light mode ───────────────────────────
export const T = {
  // Backgrounds
  bg: "#faf7f0",
  bgPage: "#f5f0e8",
  bgCard: "#ffffff",
  bgCardWarm: "#fffdf5",
  bgModal: "#ffffff",

  // Yellows
  accent: "#f0b429",
  accentDark: "#d99a0d",
  accentLight: "#fef3c7",
  accentMid: "#fde68a",
  accentGrad: "linear-gradient(135deg, #f0b429 0%, #fbbf24 100%)",

  // Weekend color
  weekend: "#e07b54",
  weekendLight: "#fff1ec",
  weekendBorder: "rgba(224,123,84,.25)",

  // Text
  text: "#1c1a14",
  textSub: "#6b6248",
  textMuted: "#766f5e",
  textOnAccent: "#ffffff",

  // Borders & shadows
  border: "rgba(240,180,41,.2)",
  borderGray: "rgba(0,0,0,.07)",
  shadow: "0 2px 12px rgba(0,0,0,.07)",
  shadowCard: "0 1px 4px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)",
  shadowFloat: "0 8px 32px rgba(0,0,0,.12)",

  // States
  done: "#a89b7a",
  doneBg: "#faf7f0",
  danger: "#e05252",

  // Gym / Workout
  gym: "#8b5cf6",
  gymDark: "#7c3aed",
  gymLight: "#f5f3ff",
  gymBg: "#faf8ff",
  gymGrad: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)",
  gymBorder: "rgba(139,92,246,.12)",
  gymShadow: "0 2px 8px rgba(139,92,246,.08), 0 4px 16px rgba(0,0,0,.03)",

  // Font
  font: "'Georgia', 'Times New Roman', serif",
  fontSans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ─── Global styles injected once ─────────────────────────────────────────────
export const GLOBAL_CSS = `
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; margin: 0; padding: 0; }
  body { background: ${T.bgPage}; font-family: ${T.fontSans}; color: ${T.text}; overscroll-behavior: none; }
  input, textarea, select, button { font-family: inherit; }
  input[type="time"]::-webkit-calendar-picker-indicator { opacity: 0.5; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${T.accentMid}; border-radius: 2px; }

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes checkPop {
    0% { transform: scale(1); }
    50% { transform: scale(1.25); }
    100% { transform: scale(1); }
  }
  @keyframes toastIn {
    from { transform: translateY(-12px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes toastOut {
    from { opacity: 1; }
    to { opacity: 0; transform: translateY(-8px); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: .4; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes taskCollapse {
    from { opacity: 1; max-height: 120px; margin-bottom: .65rem; }
    to { opacity: 0; max-height: 0; margin-bottom: 0; padding-top: 0; padding-bottom: 0; }
  }
  .task-card { animation: slideUp .2s ease; }
  .task-exit { animation: taskCollapse .25s ease forwards; overflow: hidden; }
  .modal-overlay { animation: fadeIn .15s ease; }
  .modal-sheet { animation: slideUp .25s cubic-bezier(.32,1,.23,1); }
  .check-pop { animation: checkPop .25s ease; }
  .toast-enter { animation: toastIn .25s ease; }
  .toast-exit { animation: toastOut .2s ease forwards; }
  .highlight-flash { animation: highlightFlash .8s ease; }
  @keyframes highlightFlash {
    0% { box-shadow: 0 0 0 3px rgba(240,180,41,.6); }
    100% { box-shadow: none; }
  }

  button:active { opacity: .85; transform: scale(.98); transition: transform .1s; }
  button:focus-visible { outline: 2px solid #f0b429; outline-offset: 2px; }
  input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid #f0b429; outline-offset: 1px; }
`;
