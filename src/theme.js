// ─── Theme: CSS custom properties with light/dark mode support ──────────────
// All color values use CSS custom properties so components automatically adapt
// to the active theme. Components reference T.xxx which resolves to var(--xxx).

export const T = {
  // Backgrounds
  bg: "var(--bg)",
  bgPage: "var(--bg-page)",
  bgCard: "var(--bg-card)",
  bgCardWarm: "var(--bg-card-warm)",
  bgModal: "var(--bg-modal)",

  // Accent (indigo)
  accent: "var(--accent)",
  accentDark: "var(--accent-dark)",
  accentLight: "var(--accent-light)",
  accentMid: "var(--accent-mid)",
  accentGrad: "var(--accent-grad)",

  // Weekend
  weekend: "var(--weekend)",
  weekendLight: "var(--weekend-light)",
  weekendBorder: "var(--weekend-border)",

  // Text
  text: "var(--text)",
  textSub: "var(--text-sub)",
  textMuted: "var(--text-muted)",
  textOnAccent: "var(--text-on-accent)",

  // Borders & shadows
  border: "var(--border)",
  borderGray: "var(--border-gray)",
  shadow: "var(--shadow)",
  shadowCard: "var(--shadow-card)",
  shadowFloat: "var(--shadow-float)",

  // States
  done: "var(--done)",
  doneBg: "var(--done-bg)",
  danger: "var(--danger)",
  success: "var(--success)",
  dangerBg: "var(--danger-bg)",
  successBg: "var(--success-bg)",
  dangerText: "var(--danger-text)",
  successText: "var(--success-text)",

  // Gym / Workout
  gym: "var(--gym)",
  gymDark: "var(--gym-dark)",
  gymLight: "var(--gym-light)",
  gymBg: "var(--gym-bg)",
  gymGrad: "var(--gym-grad)",
  gymBorder: "var(--gym-border)",
  gymShadow: "var(--gym-shadow)",

  // Fonts
  font: "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSans: "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

  // Spacing scale (static)
  sp1: "0.25rem",
  sp2: "0.5rem",
  sp3: "0.75rem",
  sp4: "1rem",
  sp5: "1.25rem",
  sp6: "1.5rem",
  sp8: "2rem",

  // Border radius scale (static)
  r1: "4px",
  r2: "8px",
  r3: "12px",
  r4: "16px",
  r5: "20px",
  r6: "24px",
};

// ─── Global styles injected once ─────────────────────────────────────────────
export const GLOBAL_CSS = `
  :root {
    --bg: #F8F9FC;
    --bg-page: #F1F3F9;
    --bg-card: #FFFFFF;
    --bg-card-warm: #F8F9FF;
    --bg-modal: #FFFFFF;

    --accent: #6366F1;
    --accent-dark: #4F46E5;
    --accent-light: #EEF2FF;
    --accent-mid: #C7D2FE;
    --accent-grad: linear-gradient(135deg, #6366F1 0%, #818CF8 100%);
    --accent-glow: rgba(99,102,241,.5);
    --accent-shadow: rgba(99,102,241,.25);

    --weekend: #F97316;
    --weekend-light: #FFF7ED;
    --weekend-border: rgba(249,115,22,.15);
    --weekend-grad: linear-gradient(135deg, #F97316 0%, #FB923C 100%);

    --text: #111827;
    --text-sub: #6B7280;
    --text-muted: #9CA3AF;
    --text-on-accent: #ffffff;

    --border: rgba(99,102,241,.12);
    --border-gray: rgba(0,0,0,.06);
    --shadow: 0 1px 3px rgba(0,0,0,.06), 0 2px 8px rgba(0,0,0,.04);
    --shadow-card: 0 1px 2px rgba(0,0,0,.04), 0 2px 8px rgba(0,0,0,.03);
    --shadow-float: 0 8px 30px rgba(0,0,0,.12);

    --done: #9CA3AF;
    --done-bg: #F9FAFB;
    --danger: #EF4444;
    --success: #22C55E;
    --danger-bg: #FEF2F2;
    --success-bg: #F0FDF4;
    --danger-text: #991B1B;
    --success-text: #166534;

    --gym: #8B5CF6;
    --gym-dark: #7C3AED;
    --gym-light: #F5F3FF;
    --gym-bg: #FAFAFF;
    --gym-grad: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%);
    --gym-border: rgba(139,92,246,.10);
    --gym-shadow: 0 1px 3px rgba(139,92,246,.06), 0 2px 8px rgba(0,0,0,.03);

    --login-grad: linear-gradient(160deg, #F0F1FE 0%, #E8EBFF 50%, #F5F6FF 100%);
  }

  [data-theme="dark"] {
    --bg: #0F1117;
    --bg-page: #080A10;
    --bg-card: #1A1D28;
    --bg-card-warm: #1E2130;
    --bg-modal: #1A1D28;

    --accent: #818CF8;
    --accent-dark: #A5B4FC;
    --accent-light: #1E1B4B;
    --accent-mid: #312E81;
    --accent-grad: linear-gradient(135deg, #6366F1 0%, #818CF8 100%);
    --accent-glow: rgba(129,140,248,.4);
    --accent-shadow: rgba(99,102,241,.2);

    --weekend: #FB923C;
    --weekend-light: #1C1008;
    --weekend-border: rgba(251,146,60,.15);
    --weekend-grad: linear-gradient(135deg, #EA580C 0%, #F97316 100%);

    --text: #E5E7EB;
    --text-sub: #9CA3AF;
    --text-muted: #6B7280;
    --text-on-accent: #ffffff;

    --border: rgba(99,102,241,.12);
    --border-gray: rgba(255,255,255,.06);
    --shadow: 0 1px 3px rgba(0,0,0,.2), 0 2px 8px rgba(0,0,0,.15);
    --shadow-card: 0 1px 2px rgba(0,0,0,.15), 0 2px 8px rgba(0,0,0,.12);
    --shadow-float: 0 8px 30px rgba(0,0,0,.4);

    --done: #4B5563;
    --done-bg: #111318;
    --danger: #F87171;
    --success: #4ADE80;
    --danger-bg: #3B1111;
    --success-bg: #0D2818;
    --danger-text: #FCA5A5;
    --success-text: #86EFAC;

    --gym: #A78BFA;
    --gym-dark: #8B5CF6;
    --gym-light: #1A1530;
    --gym-bg: #151228;
    --gym-grad: linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%);
    --gym-border: rgba(139,92,246,.15);
    --gym-shadow: 0 1px 3px rgba(139,92,246,.12), 0 2px 8px rgba(0,0,0,.15);

    --login-grad: linear-gradient(160deg, #0F1117 0%, #1A1D28 50%, #0F1117 100%);
  }

  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; margin: 0; padding: 0; }
  body {
    background: var(--bg-page);
    font-family: 'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: var(--text);
    overscroll-behavior: none;
    transition: background-color .3s, color .3s;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  input, textarea, select, button { font-family: inherit; }
  input[type="time"]::-webkit-calendar-picker-indicator { opacity: 0.5; }
  [data-theme="dark"] input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(1); }
  [data-theme="dark"] input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--accent-mid); border-radius: 2px; }

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
    0% { box-shadow: 0 0 0 3px var(--accent-glow); }
    100% { box-shadow: none; }
  }

  button:active { opacity: .85; transform: scale(.98); transition: transform .1s; }
  button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
`;
