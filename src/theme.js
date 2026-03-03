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

  // Accent (golden yellow)
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

  // Fonts (static — don't vary by theme)
  font: "'Georgia', 'Times New Roman', serif",
  fontSans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

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
    --bg: #faf7f0;
    --bg-page: #f5f0e8;
    --bg-card: #ffffff;
    --bg-card-warm: #fffdf5;
    --bg-modal: #ffffff;

    --accent: #f0b429;
    --accent-dark: #d99a0d;
    --accent-light: #fef3c7;
    --accent-mid: #fde68a;
    --accent-grad: linear-gradient(135deg, #f0b429 0%, #fbbf24 100%);
    --accent-glow: rgba(240,180,41,.6);
    --accent-shadow: rgba(240,180,41,.3);

    --weekend: #e07b54;
    --weekend-light: #fff1ec;
    --weekend-border: rgba(224,123,84,.25);
    --weekend-grad: linear-gradient(135deg, #e07b54 0%, #f09060 100%);

    --text: #1c1a14;
    --text-sub: #6b6248;
    --text-muted: #766f5e;
    --text-on-accent: #ffffff;

    --border: rgba(240,180,41,.2);
    --border-gray: rgba(0,0,0,.07);
    --shadow: 0 2px 12px rgba(0,0,0,.07);
    --shadow-card: 0 1px 4px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04);
    --shadow-float: 0 8px 32px rgba(0,0,0,.12);

    --done: #a89b7a;
    --done-bg: #faf7f0;
    --danger: #e05252;
    --success: #4aba6a;
    --danger-bg: #fef2f2;
    --success-bg: #f0fdf4;
    --danger-text: #991b1b;
    --success-text: #166534;

    --gym: #8b5cf6;
    --gym-dark: #7c3aed;
    --gym-light: #f5f3ff;
    --gym-bg: #faf8ff;
    --gym-grad: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
    --gym-border: rgba(139,92,246,.12);
    --gym-shadow: 0 2px 8px rgba(139,92,246,.08), 0 4px 16px rgba(0,0,0,.03);

    --login-grad: linear-gradient(160deg, #fef9ec 0%, #fdf3d0 50%, #fef6e4 100%);
  }

  [data-theme="dark"] {
    --bg: #1a1917;
    --bg-page: #121110;
    --bg-card: #242320;
    --bg-card-warm: #2a2825;
    --bg-modal: #242320;

    --accent: #f0b429;
    --accent-dark: #fbbf24;
    --accent-light: #3d3000;
    --accent-mid: #5a4500;
    --accent-grad: linear-gradient(135deg, #d99a0d 0%, #f0b429 100%);
    --accent-glow: rgba(240,180,41,.4);
    --accent-shadow: rgba(240,180,41,.2);

    --weekend: #e8845e;
    --weekend-light: #2d1a10;
    --weekend-border: rgba(224,123,84,.2);
    --weekend-grad: linear-gradient(135deg, #c06840 0%, #e07b54 100%);

    --text: #e8e4dc;
    --text-sub: #a09880;
    --text-muted: #8a8070;
    --text-on-accent: #ffffff;

    --border: rgba(240,180,41,.15);
    --border-gray: rgba(255,255,255,.08);
    --shadow: 0 2px 12px rgba(0,0,0,.3);
    --shadow-card: 0 1px 4px rgba(0,0,0,.2), 0 4px 16px rgba(0,0,0,.15);
    --shadow-float: 0 8px 32px rgba(0,0,0,.4);

    --done: #7a7060;
    --done-bg: #1a1917;
    --danger: #ef5555;
    --success: #4aba6a;
    --danger-bg: #3d1515;
    --success-bg: #0f2918;
    --danger-text: #fca5a5;
    --success-text: #86efac;

    --gym: #a78bfa;
    --gym-dark: #8b5cf6;
    --gym-light: #1f1a30;
    --gym-bg: #1a1730;
    --gym-grad: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%);
    --gym-border: rgba(139,92,246,.2);
    --gym-shadow: 0 2px 8px rgba(139,92,246,.15), 0 4px 16px rgba(0,0,0,.15);

    --login-grad: linear-gradient(160deg, #1a1917 0%, #242320 50%, #1a1917 100%);
  }

  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; margin: 0; padding: 0; }
  body {
    background: var(--bg-page);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: var(--text);
    overscroll-behavior: none;
    transition: background-color .3s, color .3s;
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
