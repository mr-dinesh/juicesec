export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    const url = new URL(request.url);

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return new Response(HTML, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    if (request.method === "POST" && url.pathname === "/tutor") {
      let body;
      try { body = await request.json(); } catch {
        return json({ ok: false, error: "Invalid JSON" }, 400, cors);
      }
      const { challenge, attempt, question, mode } = body;
      if (!challenge) return json({ ok: false, error: "Missing challenge" }, 400, cors);

      const system = `You are JuiceSec Tutor — a Socratic security mentor inside an OWASP vulnerability training app.
Rules:
- NEVER reveal the exploit string or direct answer unprompted
- When mode is "hint": ask a guiding question or give a nudge (2-3 sentences max)
- When mode is "explain": the user just solved it — explain WHY the vuln exists, real-world impact (1 sentence), and one concrete mitigation
- Be technically precise, plain language, no markdown headers or bullet points`;

      const userMsg = mode === "explain"
        ? `Challenge solved: "${challenge}". Exploit used: ${attempt}. Explain the root cause, real-world impact, and fix.`
        : `Challenge: "${challenge}". User question or attempt: ${question || attempt || "(just started)"}. Give a Socratic hint without revealing the answer.`;

      try {
        const resp = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [
            { role: "system", content: system },
            { role: "user", content: userMsg },
          ],
          temperature: 0.45,
          max_tokens: 350,
        });
        return json({ ok: true, reply: resp?.response || "" }, 200, cors);
      } catch (err) {
        return json({ ok: false, error: err.message }, 502, cors);
      }
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>JuiceSec — OWASP Vulnerability Lab</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=Inter:wght@400;500;600;700&display=swap');

:root {
  --bg:       #080c14;
  --surface:  #0e1420;
  --surface2: #131929;
  --border:   rgba(255,255,255,0.07);
  --border2:  rgba(255,255,255,0.13);
  --text:     #d4dce8;
  --muted:    #4a5568;
  --green:    #00d68f;
  --red:      #ff4757;
  --amber:    #ffa502;
  --blue:     #3d8fff;
  --purple:   #a855f7;
  --mono:     'JetBrains Mono', monospace;
  --sans:     'Inter', sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── HEADER ── */
header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border2);
  background: var(--surface);
  flex-shrink: 0;
}
.logo { display: flex; align-items: center; gap: 10px; }
.logo-icon {
  width: 28px; height: 28px; border-radius: 6px;
  background: linear-gradient(135deg, #00d68f22, #00d68f44);
  border: 1px solid var(--green);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;
}
.logo-name { font-size: 15px; font-weight: 700; letter-spacing: 0.06em; }
.logo-tag  { font-size: 10px; color: var(--muted); font-family: var(--mono); margin-top: 1px; }
.header-right { display: flex; align-items: center; gap: 16px; }
.score-badge {
  font-family: var(--mono); font-size: 11px; color: var(--green);
  background: rgba(0,214,143,0.08); border: 1px solid rgba(0,214,143,0.2);
  padding: 4px 10px; border-radius: 4px;
}
.progress-wrap { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--muted); }
.progress-bar {
  width: 100px; height: 4px; background: var(--surface2);
  border-radius: 2px; overflow: hidden;
}
.progress-fill { height: 100%; background: var(--green); border-radius: 2px; transition: width 0.4s; }

/* ── LAYOUT ── */
.app { display: flex; flex: 1; overflow: hidden; }

/* ── SIDEBAR ── */
.sidebar {
  width: 260px; flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  display: flex; flex-direction: column;
}
.sidebar-header {
  padding: 14px 16px 10px;
  font-size: 9px; letter-spacing: 0.14em; color: var(--muted);
  font-family: var(--mono);
  border-bottom: 1px solid var(--border);
}
.challenge-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
  position: relative;
}
.challenge-item:hover { background: var(--surface2); }
.challenge-item.active { background: rgba(0,214,143,0.06); border-left: 2px solid var(--green); }
.challenge-item.solved { opacity: 0.6; }
.challenge-item.solved .ci-title::after { content: ' ✓'; color: var(--green); }
.ci-num { font-family: var(--mono); font-size: 10px; color: var(--muted); width: 20px; flex-shrink: 0; }
.ci-info { flex: 1; min-width: 0; }
.ci-title { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ci-cat { font-size: 10px; color: var(--muted); font-family: var(--mono); margin-top: 2px; }
.ci-diff {
  font-size: 9px; font-family: var(--mono); font-weight: 600;
  padding: 2px 5px; border-radius: 3px; letter-spacing: 0.06em;
}
.diff-easy   { background: rgba(0,214,143,0.12); color: var(--green); }
.diff-medium { background: rgba(255,165,2,0.12);  color: var(--amber); }
.diff-hard   { background: rgba(255,71,87,0.12);   color: var(--red); }

/* ── CHALLENGE AREA ── */
.challenge-area {
  flex: 1; overflow-y: auto;
  padding: 24px;
  display: flex; flex-direction: column; gap: 20px;
}
.ch-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.ch-title-wrap {}
.ch-owasp {
  font-family: var(--mono); font-size: 10px; color: var(--blue);
  letter-spacing: 0.08em; margin-bottom: 6px;
}
.ch-title { font-size: 22px; font-weight: 700; }
.ch-desc { font-size: 13px; color: var(--muted); line-height: 1.7; margin-top: 8px; }
.ch-actions { display: flex; gap: 8px; flex-shrink: 0; }
.btn-hint {
  background: rgba(255,165,2,0.1); border: 1px solid rgba(255,165,2,0.25);
  color: var(--amber); border-radius: 6px; padding: 7px 14px;
  font-size: 12px; font-family: var(--sans); font-weight: 500;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.btn-hint:hover { background: rgba(255,165,2,0.18); }

.playground {
  background: var(--surface); border: 1px solid var(--border2);
  border-radius: 10px; overflow: hidden;
}
.playground-bar {
  background: var(--surface2); border-bottom: 1px solid var(--border);
  padding: 8px 14px; font-size: 11px; font-family: var(--mono); color: var(--muted);
  display: flex; align-items: center; gap: 8px;
}
.bar-dot { width: 8px; height: 8px; border-radius: 50%; }
.playground-body { padding: 20px; }

/* form elements */
label { display: block; font-size: 11px; color: var(--muted); font-family: var(--mono); margin-bottom: 6px; }
input[type=text], input[type=password], textarea.code-input {
  width: 100%; background: var(--bg); border: 1px solid var(--border2);
  border-radius: 6px; padding: 9px 12px;
  color: var(--text); font-family: var(--mono); font-size: 13px;
  outline: none; transition: border-color 0.2s;
}
input[type=text]:focus, input[type=password]:focus, textarea.code-input:focus {
  border-color: var(--blue);
}
textarea.code-input { resize: vertical; min-height: 80px; line-height: 1.5; }
.form-row { display: flex; flex-direction: column; gap: 14px; }
.btn-primary {
  background: var(--green); border: none; border-radius: 6px;
  padding: 9px 20px; color: #000; font-weight: 600; font-size: 13px;
  font-family: var(--sans); cursor: pointer; transition: opacity 0.15s;
  align-self: flex-start;
}
.btn-primary:hover { opacity: 0.85; }

.query-display {
  margin-top: 14px; background: var(--bg); border: 1px solid var(--border2);
  border-radius: 6px; padding: 12px 14px;
  font-family: var(--mono); font-size: 12px; line-height: 1.6;
  color: #94a3b8; white-space: pre-wrap; word-break: break-all;
}
.kw { color: var(--purple); }
.str { color: var(--amber); }

.result-box {
  margin-top: 14px; border-radius: 6px; padding: 12px 14px;
  font-family: var(--mono); font-size: 12px; line-height: 1.6;
  display: none;
}
.result-box.visible { display: block; }
.result-success { background: rgba(0,214,143,0.08); border: 1px solid rgba(0,214,143,0.25); color: var(--green); }
.result-fail    { background: rgba(255,71,87,0.08);  border: 1px solid rgba(255,71,87,0.25);  color: var(--red); }
.result-info    { background: rgba(61,143,255,0.08); border: 1px solid rgba(61,143,255,0.25); color: var(--blue); }

.solved-banner {
  display: none; background: rgba(0,214,143,0.1); border: 1px solid rgba(0,214,143,0.3);
  border-radius: 8px; padding: 14px 18px; text-align: center;
}
.solved-banner.visible { display: block; }
.solved-banner h3 { color: var(--green); font-size: 15px; margin-bottom: 4px; }
.solved-banner p { font-size: 12px; color: var(--muted); }

/* ── TUTOR PANEL ── */
.tutor-panel {
  width: 300px; flex-shrink: 0;
  border-left: 1px solid var(--border);
  display: flex; flex-direction: column;
  background: var(--surface);
}
.tutor-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 8px;
  flex-shrink: 0;
}
.tutor-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); }
.tutor-title { font-size: 12px; font-weight: 600; letter-spacing: 0.04em; }
.tutor-sub { font-size: 10px; color: var(--muted); font-family: var(--mono); margin-left: auto; }
.tutor-messages {
  flex: 1; overflow-y: auto; padding: 14px;
  display: flex; flex-direction: column; gap: 10px;
}
.msg {
  border-radius: 8px; padding: 10px 12px;
  font-size: 12px; line-height: 1.65; max-width: 100%;
}
.msg-tutor {
  background: var(--surface2); border: 1px solid var(--border);
  color: var(--text); border-top-left-radius: 2px;
}
.msg-user {
  background: rgba(0,214,143,0.08); border: 1px solid rgba(0,214,143,0.18);
  color: var(--green); border-top-right-radius: 2px; align-self: flex-end;
  font-family: var(--mono);
}
.msg-thinking {
  background: var(--surface2); border: 1px solid var(--border);
  color: var(--muted); font-style: italic; font-size: 11px;
}
.tutor-input-area {
  padding: 12px;
  border-top: 1px solid var(--border);
  display: flex; gap: 8px; flex-shrink: 0;
}
.tutor-input {
  flex: 1; background: var(--bg); border: 1px solid var(--border2);
  border-radius: 6px; padding: 8px 10px;
  color: var(--text); font-family: var(--mono); font-size: 12px;
  outline: none; resize: none; height: 36px;
  transition: border-color 0.2s;
}
.tutor-input:focus { border-color: var(--green); }
.btn-ask {
  background: rgba(0,214,143,0.15); border: 1px solid rgba(0,214,143,0.3);
  color: var(--green); border-radius: 6px; padding: 0 12px;
  font-size: 12px; font-family: var(--sans); font-weight: 600;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.btn-ask:hover { background: rgba(0,214,143,0.25); }
.btn-ask:disabled { opacity: 0.35; cursor: not-allowed; }

/* url-bar simulation */
.url-bar {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg); border: 1px solid var(--border2);
  border-radius: 6px; padding: 8px 12px; font-family: var(--mono); font-size: 12px;
}
.url-prefix { color: var(--muted); flex-shrink: 0; }
.url-input {
  flex: 1; background: transparent; border: none; outline: none;
  color: var(--blue); font-family: var(--mono); font-size: 12px;
}

/* JWT panels */
.jwt-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
.jwt-section label { color: var(--muted); font-family: var(--mono); font-size: 10px; margin-bottom: 6px; }
.jwt-token {
  font-family: var(--mono); font-size: 11px; word-break: break-all; line-height: 1.6;
  background: var(--bg); border: 1px solid var(--border2); border-radius: 6px;
  padding: 10px 12px; color: #94a3b8;
}
.jwt-part-header { color: var(--red); }
.jwt-part-payload { color: var(--amber); }
.jwt-part-sig { color: var(--blue); }

/* comment board */
.comment-list {
  display: flex; flex-direction: column; gap: 8px; margin-top: 14px;
}
.comment-item {
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 6px; padding: 10px 12px;
  font-size: 12px; line-height: 1.5;
}
.comment-meta { font-size: 10px; color: var(--muted); font-family: var(--mono); margin-bottom: 4px; }

/* robots */
.file-viewer {
  background: var(--bg); border: 1px solid var(--border2);
  border-radius: 6px; padding: 14px; font-family: var(--mono); font-size: 12px;
  line-height: 1.8; color: #94a3b8; white-space: pre;
}
.file-viewer .disallow { color: var(--red); }
.file-viewer .allow { color: var(--green); }

/* api response */
.api-response {
  background: var(--bg); border: 1px solid var(--border2);
  border-radius: 6px; padding: 14px; font-family: var(--mono); font-size: 12px;
  line-height: 1.8; white-space: pre-wrap; margin-top: 14px;
}

.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.tab-row { display: flex; gap: 4px; margin-bottom: 14px; }
.tab {
  padding: 6px 12px; border-radius: 5px; font-size: 11px; font-family: var(--mono);
  cursor: pointer; border: 1px solid var(--border); color: var(--muted);
  transition: all 0.15s;
}
.tab.active { background: rgba(0,214,143,0.1); border-color: rgba(0,214,143,0.3); color: var(--green); }

/* welcome screen */
.welcome {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 12px; color: var(--muted); text-align: center; padding: 40px;
}
.welcome-icon { font-size: 40px; }
.welcome h2 { font-size: 18px; color: var(--text); }
.welcome p { font-size: 13px; line-height: 1.7; max-width: 360px; }

/* scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
</style>
</head>
<body>

<header>
  <div class="logo">
    <div class="logo-icon">🧃</div>
    <div>
      <div class="logo-name">JUICESEC</div>
      <div class="logo-tag">owasp top 10 · vulnerability lab</div>
    </div>
  </div>
  <div class="header-right">
    <div class="progress-wrap">
      <span id="progressText">0 / 10</span>
      <div class="progress-bar"><div class="progress-fill" id="progressFill" style="width:0%"></div></div>
    </div>
    <div class="score-badge" id="scoreBadge">0 pts</div>
  </div>
</header>

<div class="app">
  <aside class="sidebar">
    <div class="sidebar-header">CHALLENGES · OWASP TOP 10 2021</div>
    <div id="challengeList"></div>
  </aside>

  <section class="challenge-area" id="challengeArea">
    <div class="welcome">
      <div class="welcome-icon">🔐</div>
      <h2>Pick a challenge</h2>
      <p>Each challenge simulates a real vulnerability. Exploit it, then ask the AI tutor to explain the root cause and fix.</p>
    </div>
  </section>

  <aside class="tutor-panel">
    <div class="tutor-header">
      <div class="tutor-dot"></div>
      <div class="tutor-title">AI Tutor</div>
      <div class="tutor-sub">workers ai</div>
    </div>
    <div class="tutor-messages" id="tutorMessages">
      <div class="msg msg-tutor">Select a challenge and I'll guide you through it. I won't give answers — I'll ask the right questions.</div>
    </div>
    <div class="tutor-input-area">
      <textarea class="tutor-input" id="tutorInput" placeholder="Ask me anything…" rows="1"></textarea>
      <button class="btn-ask" id="btnAsk">Ask</button>
    </div>
  </aside>
</div>

<script>
const WORKER = location.origin;

// ── CHALLENGE DEFINITIONS ──────────────────────────────────────────
const CHALLENGES = [
  {
    id: 'sqli', num: '01', title: 'SQL Injection',
    owasp: 'A03:2021 — Injection', diff: 'EASY', pts: 100,
    desc: 'The login form builds its SQL query using string concatenation. Bypass authentication without knowing the real password.',
    render: renderSQLi,
  },
  {
    id: 'xss-reflected', num: '02', title: 'Reflected XSS',
    owasp: 'A03:2021 — Injection', diff: 'EASY', pts: 100,
    desc: 'The search endpoint reflects your query directly into the page without sanitization. Make an alert fire.',
    render: renderXSSReflected,
  },
  {
    id: 'broken-auth', num: '03', title: 'Broken Authentication',
    owasp: 'A07:2021 — Auth Failures', diff: 'EASY', pts: 100,
    desc: 'The admin account uses one of the top 10 most common passwords. Find it.',
    render: renderBrokenAuth,
  },
  {
    id: 'idor', num: '04', title: 'IDOR',
    owasp: 'A01:2021 — Broken Access Control', diff: 'EASY', pts: 100,
    desc: "You are user #42. The order API uses your user ID directly in the URL with no authorization check. Access another user's data.",
    render: renderIDOR,
  },
  {
    id: 'robots', num: '05', title: 'Security Misconfiguration',
    owasp: 'A05:2021 — Misconfiguration', diff: 'EASY', pts: 100,
    desc: "The site's robots.txt file reveals paths that were meant to stay hidden. Find and visit the secret admin panel.",
    render: renderRobots,
  },
  {
    id: 'sensitive-data', num: '06', title: 'Sensitive Data Exposure',
    owasp: 'A02:2021 — Cryptographic Failures', diff: 'MEDIUM', pts: 150,
    desc: 'An API endpoint leaks user records without authentication. Find what sensitive data is exposed in the response.',
    render: renderSensitiveData,
  },
  {
    id: 'jwt', num: '07', title: 'JWT None Algorithm',
    owasp: 'A02:2021 — Cryptographic Failures', diff: 'MEDIUM', pts: 150,
    desc: 'The app uses JWTs but accepts the "none" algorithm, skipping signature verification. Escalate your role from user to admin.',
    render: renderJWT,
  },
  {
    id: 'cmdi', num: '08', title: 'Command Injection',
    owasp: 'A03:2021 — Injection', diff: 'MEDIUM', pts: 150,
    desc: 'The ping utility passes your input directly to a shell command. Inject an extra command to read a sensitive file.',
    render: renderCmdInjection,
  },
  {
    id: 'ssrf', num: '09', title: 'SSRF',
    owasp: 'A10:2021 — SSRF', diff: 'HARD', pts: 200,
    desc: 'The URL preview feature fetches any URL server-side. Abuse it to reach internal services not exposed to the internet.',
    render: renderSSRF,
  },
  {
    id: 'xss-stored', num: '10', title: 'Stored XSS',
    owasp: 'A03:2021 — Injection', diff: 'HARD', pts: 200,
    desc: 'The comment board stores and renders user input as raw HTML. Inject a payload that executes for every visitor.',
    render: renderXSSStored,
  },
];

// ── STATE ──────────────────────────────────────────────────────────
const solved = {};
let active = null;
let score = 0;

// ── BUILD SIDEBAR ──────────────────────────────────────────────────
const list = document.getElementById('challengeList');
CHALLENGES.forEach(ch => {
  const el = document.createElement('div');
  el.className = 'challenge-item';
  el.id = 'item-' + ch.id;
  el.innerHTML = \`
    <span class="ci-num">\${ch.num}</span>
    <div class="ci-info">
      <div class="ci-title">\${ch.title}</div>
      <div class="ci-cat">\${ch.owasp}</div>
    </div>
    <span class="ci-diff diff-\${ch.diff.toLowerCase()}">\${ch.diff}</span>
  \`;
  el.addEventListener('click', () => loadChallenge(ch));
  list.appendChild(el);
});

function loadChallenge(ch) {
  active = ch;
  document.querySelectorAll('.challenge-item').forEach(el => el.classList.remove('active'));
  document.getElementById('item-' + ch.id).classList.add('active');

  const area = document.getElementById('challengeArea');
  area.innerHTML = \`
    <div class="ch-header">
      <div class="ch-title-wrap">
        <div class="ch-owasp">\${ch.owasp} &nbsp;·&nbsp; \${ch.pts} pts</div>
        <div class="ch-title">\${ch.title}</div>
        <div class="ch-desc">\${ch.desc}</div>
      </div>
      <div class="ch-actions">
        <button class="btn-hint" onclick="askHint()">💡 Hint</button>
      </div>
    </div>
    <div id="playgroundContainer"></div>
    <div class="solved-banner" id="solvedBanner">
      <h3>🎉 Challenge Solved!</h3>
      <p>The tutor is explaining the vulnerability — check the panel →</p>
    </div>
  \`;

  ch.render(document.getElementById('playgroundContainer'), ch);
  addTutorMsg('tutor', \`Starting "\${ch.title}". \${ch.diff === 'EASY' ? 'Good starting point.' : ch.diff === 'HARD' ? 'This one requires careful thought.' : 'This needs a bit of lateral thinking.'} What do you know about this type of vulnerability?\`);
}

function markSolved(ch, exploitUsed) {
  if (solved[ch.id]) return;
  solved[ch.id] = true;
  score += ch.pts;

  document.getElementById('item-' + ch.id).classList.add('solved');
  const banner = document.getElementById('solvedBanner');
  if (banner) banner.classList.add('visible');

  const filled = Object.keys(solved).length;
  document.getElementById('progressText').textContent = \`\${filled} / 10\`;
  document.getElementById('progressFill').style.width = (filled * 10) + '%';
  document.getElementById('scoreBadge').textContent = score + ' pts';

  callTutor({ challenge: ch.title, attempt: exploitUsed, mode: 'explain' });
}

// ── TUTOR ──────────────────────────────────────────────────────────
async function callTutor(payload) {
  const btn = document.getElementById('btnAsk');
  if (btn) btn.disabled = true;
  const thinkId = addTutorMsg('thinking', 'Thinking…');
  try {
    const res = await fetch(WORKER + '/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    removeTutorMsg(thinkId);
    addTutorMsg('tutor', data.ok ? data.reply : 'Error: ' + data.error);
  } catch (err) {
    removeTutorMsg(thinkId);
    addTutorMsg('tutor', 'Network error: ' + err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function askHint() {
  if (!active) return;
  addTutorMsg('user', '[hint request]');
  callTutor({ challenge: active.title, mode: 'hint', question: 'I need a hint to get started.' });
}

let msgId = 0;
function addTutorMsg(type, text) {
  const id = 'msg-' + (++msgId);
  const wrap = document.getElementById('tutorMessages');
  const el = document.createElement('div');
  el.id = id;
  el.className = type === 'user' ? 'msg msg-user' : type === 'thinking' ? 'msg msg-thinking' : 'msg msg-tutor';
  el.textContent = text;
  wrap.appendChild(el);
  wrap.scrollTop = wrap.scrollHeight;
  return id;
}
function removeTutorMsg(id) {
  document.getElementById(id)?.remove();
}

const btnAsk = document.getElementById('btnAsk');
const tutorInput = document.getElementById('tutorInput');
btnAsk.addEventListener('click', sendUserQuestion);
tutorInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendUserQuestion(); }
});
function sendUserQuestion() {
  const q = tutorInput.value.trim();
  if (!q || !active) return;
  addTutorMsg('user', q);
  tutorInput.value = '';
  callTutor({ challenge: active.title, mode: 'hint', question: q });
}

// ── ESC helper ─────────────────────────────────────────────────────
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// ═══════════════════════════════════════════════════════════════════
// CHALLENGE RENDERERS
// ═══════════════════════════════════════════════════════════════════

// 01 — SQL INJECTION ───────────────────────────────────────────────
function renderSQLi(container, ch) {
  container.innerHTML = \`
    <div class="playground">
      <div class="playground-bar">
        <div class="bar-dot" style="background:#ff5f57"></div>
        <div class="bar-dot" style="background:#ffbd2e; margin-left:4px"></div>
        <div class="bar-dot" style="background:#28ca41; margin-left:4px"></div>
        <span style="margin-left:8px">ShopApp — Login</span>
      </div>
      <div class="playground-body">
        <div class="form-row">
          <div>
            <label>USERNAME</label>
            <input type="text" id="sqli-user" placeholder="Enter username" />
          </div>
          <div>
            <label>PASSWORD</label>
            <input type="password" id="sqli-pass" placeholder="Enter password" />
          </div>
        </div>
        <div class="query-display" id="sqli-query"><span class="kw">SELECT</span> * <span class="kw">FROM</span> users <span class="kw">WHERE</span> username=<span class="str">''</span> <span class="kw">AND</span> password=<span class="str">''</span></div>
        <div style="margin-top:14px; display:flex; gap:10px; align-items:center">
          <button class="btn-primary" onclick="checkSQLi()">Login</button>
          <span style="font-size:11px; color:var(--muted); font-family:var(--mono)">Watch the query above as you type</span>
        </div>
        <div class="result-box" id="sqli-result"></div>
      </div>
    </div>
  \`;

  const uEl = document.getElementById('sqli-user');
  const pEl = document.getElementById('sqli-pass');
  function updateQuery() {
    const u = uEl.value, p = pEl.value;
    document.getElementById('sqli-query').innerHTML =
      \`<span class="kw">SELECT</span> * <span class="kw">FROM</span> users <span class="kw">WHERE</span> username=<span class="str">'\${esc(u)}'</span> <span class="kw">AND</span> password=<span class="str">'\${esc(p)}'</span>\`;
  }
  uEl.addEventListener('input', updateQuery);
  pEl.addEventListener('input', updateQuery);
}

function checkSQLi() {
  const u = document.getElementById('sqli-user').value;
  const r = document.getElementById('sqli-result');
  r.className = 'result-box visible';
  // Classic injection: ' OR '1'='1, ' OR 1=1--, admin' --, admin'#
  const injected = /'\\s*(or|OR)\\s*['1]|'[\\s]*(-{2}|#)|admin'\\s*(-{2}|#)/i.test(u) || u.includes("' OR '1'='1");
  if (injected) {
    r.classList.add('result-success');
    r.textContent = '✓ Logged in as admin. The injected OR condition made the WHERE clause always true, bypassing password verification.';
    markSolved(CHALLENGES[0], u);
  } else {
    r.classList.add('result-fail');
    r.classList.remove('result-success');
    r.textContent = '✗ Login failed. Hint: what SQL character breaks out of a string literal?';
  }
}

// 02 — REFLECTED XSS ───────────────────────────────────────────────
function renderXSSReflected(container, ch) {
  container.innerHTML = \`
    <div class="playground">
      <div class="playground-bar">
        <div class="bar-dot" style="background:#ff5f57"></div>
        <div class="bar-dot" style="background:#ffbd2e; margin-left:4px"></div>
        <div class="bar-dot" style="background:#28ca41; margin-left:4px"></div>
        <span style="margin-left:8px">ShopApp — Product Search</span>
      </div>
      <div class="playground-body">
        <div class="form-row">
          <div>
            <label>SEARCH PRODUCTS</label>
            <input type="text" id="xss-search" placeholder="Search…" />
          </div>
        </div>
        <button class="btn-primary" style="margin-top:12px" onclick="checkXSSReflected()">Search</button>
        <div id="xss-reflected-output" style="margin-top:16px; padding:14px; background:var(--bg); border:1px solid var(--border2); border-radius:6px; font-size:13px; min-height:40px; display:none;"></div>
        <div class="result-box" id="xss-ref-result"></div>
      </div>
    </div>
  \`;
}

function checkXSSReflected() {
  const val = document.getElementById('xss-search').value;
  const out = document.getElementById('xss-reflected-output');
  const r   = document.getElementById('xss-ref-result');
  out.style.display = 'block';
  const hasPayload = /<[a-z][\\s\\S]*>/i.test(val) && /on\\w+\\s*=|<script|javascript:/i.test(val);
  if (hasPayload) {
    out.innerHTML = 'Showing results for: ' + val;
    r.className = 'result-box visible result-success';
    r.textContent = '✓ XSS payload reflected and executed. The search term was inserted into the DOM without escaping.';
    // fire the XSS sim visually
    setTimeout(() => {
      try { out.querySelector('[onerror],[onload],[onclick]')?.dispatchEvent(new Event('load')); } catch {}
    }, 100);
    markSolved(CHALLENGES[1], val);
  } else {
    out.textContent = 'Showing results for: ' + val + ' (0 products found)';
    r.className = 'result-box visible result-fail';
    r.textContent = '✗ No payload detected. Try injecting an HTML tag with an event handler.';
  }
}

// 03 — BROKEN AUTH ─────────────────────────────────────────────────
const WEAK_CREDS = { admin: 'admin', root: 'root', administrator: 'password', admin2: '123456' };

function renderBrokenAuth(container, ch) {
  container.innerHTML = \`
    <div class="playground">
      <div class="playground-bar">
        <div class="bar-dot" style="background:#ff5f57"></div>
        <div class="bar-dot" style="background:#ffbd2e; margin-left:4px"></div>
        <div class="bar-dot" style="background:#28ca41; margin-left:4px"></div>
        <span style="margin-left:8px">ShopApp — Admin Login</span>
      </div>
      <div class="playground-body">
        <div style="font-size:11px; color:var(--muted); font-family:var(--mono); margin-bottom:14px">
          ATTEMPTS: <span id="auth-attempts" style="color:var(--amber)">0</span>
          &nbsp;·&nbsp; No lockout implemented.
        </div>
        <div class="form-row">
          <div><label>USERNAME</label><input type="text" id="auth-user" placeholder="username" /></div>
          <div><label>PASSWORD</label><input type="password" id="auth-pass" placeholder="password" /></div>
        </div>
        <button class="btn-primary" style="margin-top:12px" onclick="checkBrokenAuth()">Login</button>
        <div class="result-box" id="auth-result"></div>
      </div>
    </div>
  \`;
}

let authAttempts = 0;
function checkBrokenAuth() {
  const u = document.getElementById('auth-user').value.toLowerCase().trim();
  const p = document.getElementById('auth-pass').value.trim();
  authAttempts++;
  document.getElementById('auth-attempts').textContent = authAttempts;
  const r = document.getElementById('auth-result');
  if (WEAK_CREDS[u] && WEAK_CREDS[u] === p) {
    r.className = 'result-box visible result-success';
    r.textContent = \`✓ Logged in as "\${u}". Credentials found: \${u}/\${p}\`;
    markSolved(CHALLENGES[2], \`\${u}:\${p}\`);
  } else {
    r.className = 'result-box visible result-fail';
    r.textContent = '✗ Invalid credentials. Notice: no lockout, no CAPTCHA, no rate limit.';
  }
}

// 04 — IDOR ────────────────────────────────────────────────────────
const ORDER_DB = {
  '1':  { user: 'admin@shopapp.internal', item: 'Classified Report', total: '$0.00', secret: true },
  '42': { user: 'you@example.com', item: 'Blue Widget', total: '$19.99', secret: false },
  '99': { user: 'bob@example.com', item: 'Red Gadget', total: '$49.99', secret: false },
};

function renderIDOR(container, ch) {
  container.innerHTML = \`
    <div class="playground">
      <div class="playground-bar">
        <div class="bar-dot" style="background:#ff5f57"></div>
        <div class="bar-dot" style="background:#ffbd2e; margin-left:4px"></div>
        <div class="bar-dot" style="background:#28ca41; margin-left:4px"></div>
        <span style="margin-left:8px">ShopApp — My Orders</span>
      </div>
      <div class="playground-body">
        <div style="font-size:12px; color:var(--muted); margin-bottom:14px">You are logged in as <code style="color:var(--green)">user_id=42</code>. Your request URL:</div>
        <div class="url-bar">
          <span class="url-prefix">GET /api/orders/</span>
          <input class="url-input" id="idor-id" value="42" />
        </div>
        <button class="btn-primary" style="margin-top:12px" onclick="checkIDOR()">Fetch Order</button>
        <div class="api-response" id="idor-response" style="display:none"></div>
        <div class="result-box" id="idor-result"></div>
      </div>
    </div>
  \`;
}

function checkIDOR() {
  const id = document.getElementById('idor-id').value.trim();
  const resp = document.getElementById('idor-response');
  const r = document.getElementById('idor-result');
  resp.style.display = 'block';
  const order = ORDER_DB[id];
  if (!order) {
    resp.style.color = 'var(--muted)';
    resp.textContent = JSON.stringify({ error: 'Order not found' }, null, 2);
    r.className = 'result-box visible result-fail';
    r.textContent = '✗ No record at that ID. Try known IDs.';
    return;
  }
  resp.style.color = order.secret ? 'var(--amber)' : '#94a3b8';
  resp.textContent = JSON.stringify({ order_id: id, ...order }, null, 2);
  if (id !== '42') {
    r.className = 'result-box visible result-success';
    r.textContent = \`✓ Accessed order #\${id} belonging to another user. No authorization check was performed.\`;
    markSolved(CHALLENGES[3], \`/api/orders/\${id}\`);
  } else {
    r.className = 'result-box visible result-info';
    r.textContent = "This is your own order. The vulnerability is accessing someone else's.";
  }
}

// 05 — SECURITY MISCONFIGURATION (robots.txt) ──────────────────────
function renderRobots(container, ch) {
  container.innerHTML = \`
    <div class="playground">
      <div class="playground-bar">
        <div class="bar-dot" style="background:#ff5f57"></div>
        <div class="bar-dot" style="background:#ffbd2e; margin-left:4px"></div>
        <div class="bar-dot" style="background:#28ca41; margin-left:4px"></div>
        <span style="margin-left:8px">shopapp.example.com</span>
      </div>
      <div class="playground-body">
        <div class="tab-row">
          <div class="tab active" onclick="robotsTab('robots')">robots.txt</div>
          <div class="tab" onclick="robotsTab('visit')" id="robots-visit-tab">Visit Path</div>
        </div>
        <div id="robots-tab-content">
          <div class="file-viewer"><span class="allow">User-agent: *</span>
<span class="allow">Allow: /</span>
<span class="allow">Allow: /products</span>
<span class="allow">Allow: /about</span>
<span class="disallow">Disallow: /admin-9f3a2c</span>
<span class="disallow">Disallow: /backup-2024</span>
<span class="disallow">Disallow: /.env</span></div>
        </div>
      </div>
    </div>
  \`;
}

function robotsTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  const content = document.getElementById('robots-tab-content');
  if (tab === 'robots') {
    content.innerHTML = \`<div class="file-viewer"><span class="allow">User-agent: *</span>
<span class="allow">Allow: /</span>
<span class="allow">Allow: /products</span>
<span class="allow">Allow: /about</span>
<span class="disallow">Disallow: /admin-9f3a2c</span>
<span class="disallow">Disallow: /backup-2024</span>
<span class="disallow">Disallow: /.env</span></div>\`;
  } else {
    content.innerHTML = \`
      <div>
        <label>NAVIGATE TO PATH</label>
        <div class="url-bar">
          <span class="url-prefix">shopapp.example.com</span>
          <input class="url-input" id="robots-path" placeholder="/..." />
        </div>
        <button class="btn-primary" style="margin-top:12px" onclick="checkRobots()">Go</button>
        <div class="result-box" id="robots-result"></div>
        <div class="api-response" id="robots-page" style="display:none"></div>
      </div>
    \`;
  }
}

function checkRobots() {
  const p = document.getElementById('robots-path')?.value.trim();
  const r = document.getElementById('robots-result');
  const page = document.getElementById('robots-page');
  if (!p) return;
  if (p === '/admin-9f3a2c' || p.includes('admin-9f3a2c')) {
    r.className = 'result-box visible result-success';
    r.textContent = '✓ Admin panel found via robots.txt enumeration.';
    page.style.display = 'block';
    page.style.color = 'var(--amber)';
    page.textContent = '200 OK — Admin Panel\\n{\\n  "users": 1482,\\n  "orders": 9341,\\n  "revenue": "$284,220"\\n}';
    markSolved(CHALLENGES[4], p);
  } else if (p === '/.env') {
    r.className = 'result-box visible result-success';
    r.textContent = '✓ Bonus: .env file exposed! (challenge solved via alternate path)';
    page.style.display = 'block'; page.style.color = 'var(--red)';
    page.textContent = 'DB_PASSWORD=supersecret123\\nSECRET_KEY=abc123\\nSTRIPE_KEY=sk_live_...';
    markSolved(CHALLENGES[4], p);
  } else {
    r.className = 'result-box visible result-fail';
    r.textContent = '✗ 404 — page not found. Have you read robots.txt carefully?';
    page.style.display = 'none';
  }
}

// 06 — SENSITIVE DATA EXPOSURE ─────────────────────────────────────
function renderSensitiveData(container, ch) {
  container.innerHTML = \`
    <div class="playground">
      <div class="playground-bar">
        <div class="bar-dot" style="background:#ff5f57"></div>
        <div class="bar-dot" style="background:#ffbd2e; margin-left:4px"></div>
        <div class="bar-dot" style="background:#28ca41; margin-left:4px"></div>
        <span style="margin-left:8px">ShopApp — API Explorer</span>
      </div>
      <div class="playground-body">
        <div style="font-size:12px; color:var(--muted); margin-bottom:14px">Try different API endpoints. No authentication header required.</div>
        <div class="url-bar">
          <span class="url-prefix">GET </span>
          <input class="url-input" id="sd-endpoint" value="/api/v1/products" />
        </div>
        <button class="btn-primary" style="margin-top:12px" onclick="checkSensitiveData()">Send Request</button>
        <div class="api-response" id="sd-response" style="display:none; color:#94a3b8"></div>
        <div class="result-box" id="sd-result"></div>
      </div>
    </div>
  \`;
}

function checkSensitiveData() {
  const ep = document.getElementById('sd-endpoint').value.trim();
  const resp = document.getElementById('sd-response');
  const r = document.getElementById('sd-result');
  resp.style.display = 'block';
  if (ep === '/api/v1/products') {
    resp.textContent = JSON.stringify([{ id:1, name:'Widget', price:19.99 }, { id:2, name:'Gadget', price:49.99 }], null, 2);
    r.className = 'result-box visible result-info';
    r.textContent = 'Products returned. This endpoint looks safe. What other endpoints might exist?';
  } else if (ep === '/api/v1/users' || ep === '/api/users') {
    resp.style.color = 'var(--amber)';
    resp.textContent = JSON.stringify([
      { id:1, email:'admin@shopapp.internal', password:'5f4dcc3b5aa765d61d8327deb882cf99', cc:'4111-1111-1111-1111', role:'admin' },
      { id:42, email:'you@example.com',       password:'e10adc3949ba59abbe56e057f20f883e', cc:'5500-0000-0000-0004', role:'user' },
    ], null, 2);
    r.className = 'result-box visible result-success';
    r.textContent = '✓ Unauthenticated access to user records including MD5-hashed passwords and plaintext credit card numbers.';
    markSolved(CHALLENGES[5], ep);
  } else {
    resp.textContent = JSON.stringify({ error: '404 Not Found' }, null, 2);
    r.className = 'result-box visible result-fail';
    r.textContent = '✗ Endpoint not found. Think about what resource the app manages.';
  }
}

// 07 — JWT NONE ALGORITHM ──────────────────────────────────────────
const LEGIT_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsInJvbGUiOiJ1c2VyIiwiZXhwIjoxNzQ1MDAwMDAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

function renderJWT(container, ch) {
  const parts = LEGIT_JWT.split('.');
  container.innerHTML = \`
    <div class="playground">
      <div class="playground-bar">
        <div class="bar-dot" style="background:#ff5f57"></div>
        <div class="bar-dot" style="background:#ffbd2e; margin-left:4px"></div>
        <div class="bar-dot" style="background:#28ca41; margin-left:4px"></div>
        <span style="margin-left:8px">ShopApp — Token Inspector</span>
      </div>
      <div class="playground-body">
        <div style="margin-bottom:14px">
          <label>YOUR CURRENT TOKEN</label>
          <div class="jwt-token">
            <span class="jwt-part-header">\${parts[0]}</span>.<span class="jwt-part-payload">\${parts[1]}</span>.<span class="jwt-part-sig">\${parts[2]}</span>
          </div>
        </div>
        <div class="two-col">
          <div>
            <label>EDIT HEADER (JSON)</label>
            <textarea class="code-input" id="jwt-header">{"alg":"HS256","typ":"JWT"}</textarea>
          </div>
          <div>
            <label>EDIT PAYLOAD (JSON)</label>
            <textarea class="code-input" id="jwt-payload">{"sub":"42","role":"user","exp":1745000000}</textarea>
          </div>
        </div>
        <div style="margin-top:14px; font-size:11px; color:var(--muted); font-family:var(--mono)">
          Signature is ignored when alg is "none". Construct your token and submit.
        </div>
        <button class="btn-primary" style="margin-top:10px" onclick="checkJWT()">Submit Token</button>
        <div class="result-box" id="jwt-result"></div>
      </div>
    </div>
  \`;
}

function b64url(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
}
function checkJWT() {
  const r = document.getElementById('jwt-result');
  let header, payload;
  try { header  = JSON.parse(document.getElementById('jwt-header').value); }
  catch { r.className='result-box visible result-fail'; r.textContent='✗ Invalid JSON in header.'; return; }
  try { payload = JSON.parse(document.getElementById('jwt-payload').value); }
  catch { r.className='result-box visible result-fail'; r.textContent='✗ Invalid JSON in payload.'; return; }

  const algNone = (header.alg||'').toLowerCase() === 'none';
  const isAdmin = (payload.role||'').toLowerCase() === 'admin';
  const token = b64url(JSON.stringify(header)) + '.' + b64url(JSON.stringify(payload)) + '.';

  if (algNone && isAdmin) {
    r.className = 'result-box visible result-success';
    r.textContent = \`✓ Token accepted. Role escalated to admin using alg:none.\nToken: \${token}\`;
    markSolved(CHALLENGES[6], 'alg:none + role:admin');
  } else if (algNone && !isAdmin) {
    r.className = 'result-box visible result-info';
    r.textContent = 'Signature check skipped (alg:none works!). But your role is still "user". What else needs to change?';
  } else {
    r.className = 'result-box visible result-fail';
    r.textContent = '✗ Signature verified — token rejected. What algorithm tells the server to skip verification?';
  }
}

// 08 — COMMAND INJECTION ───────────────────────────────────────────
function renderCmdInjection(container, ch) {
  container.innerHTML = \`
    <div class="playground">
      <div class="playground-bar">
        <div class="bar-dot" style="background:#ff5f57"></div>
        <div class="bar-dot" style="background:#ffbd2e; margin-left:4px"></div>
        <div class="bar-dot" style="background:#28ca41; margin-left:4px"></div>
        <span style="margin-left:8px">ShopApp — Network Diagnostics (Admin)</span>
      </div>
      <div class="playground-body">
        <div style="font-size:12px; color:var(--muted); margin-bottom:14px">
          Runs: <code style="color:var(--amber); font-family:var(--mono)">ping -c 1 [YOUR_INPUT]</code>
        </div>
        <div>
          <label>TARGET HOST</label>
          <input type="text" id="cmdi-input" placeholder="e.g. 8.8.8.8" />
        </div>
        <button class="btn-primary" style="margin-top:12px" onclick="checkCmdInjection()">Run Ping</button>
        <div class="api-response" id="cmdi-output" style="display:none; font-size:11px; line-height:1.8"></div>
        <div class="result-box" id="cmdi-result"></div>
      </div>
    </div>
  \`;
}

function checkCmdInjection() {
  const val = document.getElementById('cmdi-input').value;
  const out = document.getElementById('cmdi-output');
  const r = document.getElementById('cmdi-result');
  out.style.display = 'block';
  const injected = /[;&|$()\`\\n]/.test(val);
  const readsFile = /passwd|shadow|flag|secret|env|cat|ls|whoami|id\\b/i.test(val);
  if (injected && readsFile) {
    out.style.color = 'var(--amber)';
    out.textContent = \`$ ping -c 1 \${val}
PING 8.8.8.8 ... 1 packets transmitted

$ cat /etc/passwd
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
shopapp:x:1001:1001::/home/shopapp:/bin/bash\`;
    r.className = 'result-box visible result-success';
    r.textContent = '✓ Command injection successful. The shell executed your injected command alongside ping.';
    markSolved(CHALLENGES[7], val);
  } else if (injected) {
    out.style.color = '#94a3b8';
    out.textContent = \`$ ping -c 1 \${val.split(/[;&|]/)[0]}\nPING complete.\n[injection separator detected — try reading a file]\`;
    r.className = 'result-box visible result-info';
    r.textContent = 'You found the injection point! Now chain a command that reads sensitive data.';
  } else {
    out.style.color = '#94a3b8';
    out.textContent = \`$ ping -c 1 \${val}\nPING \${val}: 56 data bytes\n64 bytes from \${val}: icmp_seq=0 ttl=57 time=8.2 ms\`;
    r.className = 'result-box visible result-fail';
    r.textContent = '✗ Normal ping executed. How do shells chain multiple commands?';
  }
}

// 09 — SSRF ────────────────────────────────────────────────────────
function renderSSRF(container, ch) {
  container.innerHTML = \`
    <div class="playground">
      <div class="playground-bar">
        <div class="bar-dot" style="background:#ff5f57"></div>
        <div class="bar-dot" style="background:#ffbd2e; margin-left:4px"></div>
        <div class="bar-dot" style="background:#28ca41; margin-left:4px"></div>
        <span style="margin-left:8px">ShopApp — Link Preview</span>
      </div>
      <div class="playground-body">
        <div style="font-size:12px; color:var(--muted); margin-bottom:14px">
          Paste any URL and we'll generate a preview. The server fetches it for you.
        </div>
        <div>
          <label>URL TO PREVIEW</label>
          <input type="text" id="ssrf-url" placeholder="https://example.com" />
        </div>
        <button class="btn-primary" style="margin-top:12px" onclick="checkSSRF()">Fetch Preview</button>
        <div class="api-response" id="ssrf-output" style="display:none"></div>
        <div class="result-box" id="ssrf-result"></div>
      </div>
    </div>
  \`;
}

function checkSSRF() {
  const val = document.getElementById('ssrf-url').value.trim();
  const out = document.getElementById('ssrf-output');
  const r = document.getElementById('ssrf-result');
  out.style.display = 'block';
  const isInternal = /localhost|127\\.|0\\.0\\.0\\.0|10\\.|192\\.168\\.|172\\.(1[6-9]|2\\d|3[01])\\.|169\\.254\\.|internal|\\.local/i.test(val);
  const isMetadata = /169\\.254\\.169\\.254|metadata\\.google|instance-data/i.test(val);
  if (isMetadata) {
    out.style.color = 'var(--red)';
    out.textContent = \`Fetching: \${val}
HTTP/1.1 200 OK

ami-id: ami-0abcdef1234567890
instance-type: t3.medium
iam/security-credentials/shopapp-role:
{
  "AccessKeyId": "ASIAXXXXXXXXXXX",
  "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY",
  "Token": "AQoDYXdzEJr..."
}\`;
    r.className = 'result-box visible result-success';
    r.textContent = '✓ Cloud metadata endpoint reached. IAM credentials exposed — attacker can pivot to AWS.';
    markSolved(CHALLENGES[8], val);
  } else if (isInternal) {
    out.style.color = 'var(--amber)';
    out.textContent = \`Fetching: \${val}
HTTP/1.1 200 OK
Server: internal-admin/1.0

Internal Admin Dashboard
Users: 1482 | Revenue: $284,220
[This service is not exposed externally]\`;
    r.className = 'result-box visible result-success';
    r.textContent = '✓ Internal service reached via SSRF. The server fetched an address only accessible from within the network.';
    markSolved(CHALLENGES[8], val);
  } else if (val.startsWith('http')) {
    out.style.color = '#94a3b8';
    out.textContent = \`Fetching: \${val}\nHTTP/1.1 200 OK\n\n[External page content...]\`;
    r.className = 'result-box visible result-info';
    r.textContent = 'External URL fetched. The vulnerability is using this to reach addresses the server can access but you cannot.';
  } else {
    r.className = 'result-box visible result-fail';
    r.textContent = '✗ Enter a valid URL.';
    out.style.display = 'none';
  }
}

// 10 — STORED XSS ──────────────────────────────────────────────────
const commentStore = [
  { user: 'alice', text: 'Great product! Works perfectly.', ts: '2 hours ago' },
  { user: 'bob',   text: 'Fast delivery, would recommend.', ts: '1 hour ago' },
];

function renderXSSStored(container, ch) {
  container.innerHTML = \`
    <div class="playground">
      <div class="playground-bar">
        <div class="bar-dot" style="background:#ff5f57"></div>
        <div class="bar-dot" style="background:#ffbd2e; margin-left:4px"></div>
        <div class="bar-dot" style="background:#28ca41; margin-left:4px"></div>
        <span style="margin-left:8px">ShopApp — Product Reviews</span>
      </div>
      <div class="playground-body">
        <div style="margin-bottom:14px">
          <label>POST A REVIEW</label>
          <textarea class="code-input" id="stored-xss-input" placeholder="Write your review…"></textarea>
          <div style="font-size:10px; color:var(--muted); font-family:var(--mono); margin-top:6px">
            Name: <span style="color:var(--amber)">guest_\${Math.floor(Math.random()*9000)+1000}</span>
          </div>
        </div>
        <button class="btn-primary" onclick="submitStoredXSS()">Post Review</button>
        <div class="comment-list" id="comment-list"></div>
        <div class="result-box" id="stored-result"></div>
      </div>
    </div>
  \`;
  renderComments();
}

function renderComments() {
  const list = document.getElementById('comment-list');
  if (!list) return;
  list.innerHTML = commentStore.map(c => \`
    <div class="comment-item">
      <div class="comment-meta">\${esc(c.user)} · \${c.ts}</div>
      <div>\${c.text}</div>
    </div>
  \`).join('');
}

function submitStoredXSS() {
  const val = document.getElementById('stored-xss-input').value;
  const r = document.getElementById('stored-result');
  const hasScript = /<script[\\s\\S]*?>[\\s\\S]*?<\\/script>/i.test(val);
  const hasHandler = /on\\w+\\s*=/i.test(val);
  const hasTag = /<[a-z][\\s\\S]*?>/i.test(val);
  const guestName = 'guest_' + (Math.floor(Math.random()*9000)+1000);

  if (hasScript || hasHandler) {
    commentStore.push({ user: guestName, text: val, ts: 'just now' });
    renderComments();
    // Execute the stored payload visually
    setTimeout(() => {
      const newComment = document.getElementById('comment-list').lastElementChild;
      if (newComment) {
        const div = newComment.querySelector('div:last-child');
        if (div) div.innerHTML = val;
      }
    }, 100);
    r.className = 'result-box visible result-success';
    r.textContent = '✓ Stored XSS payload injected. Every user who loads this page will execute your script.';
    markSolved(CHALLENGES[9], val);
  } else if (hasTag) {
    commentStore.push({ user: guestName, text: val, ts: 'just now' });
    renderComments();
    r.className = 'result-box visible result-info';
    r.textContent = 'HTML tag stored and rendered unsanitized — but no executable payload. Add an event handler or script tag.';
  } else {
    commentStore.push({ user: guestName, text: esc(val), ts: 'just now' });
    renderComments();
    r.className = 'result-box visible result-fail';
    r.textContent = '✗ Plain text stored safely. The challenge is injecting executable code.';
  }
}
</script>
</body>
</html>`;
