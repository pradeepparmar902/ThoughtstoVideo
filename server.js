// ═══════════════════════════════════════════════════════════════
// Pradeep Parmar — Belief Creator Studio
// Backend API Server
// Handles AI calls server-side so API key is NEVER exposed
// ═══════════════════════════════════════════════════════════════

const express  = require(‘express’);
const cors     = require(‘cors’);
const path     = require(‘path’);
require(‘dotenv’).config();

const app = express();
app.use(cors());
app.use(express.json({ limit: ‘2mb’ }));

// ── Serve the frontend ──
// Serve static files from root OR public/ subfolder (works either way)
app.use(express.static(path.join(__dirname, ‘public’)));
app.use(express.static(path.join(__dirname)));

// ═══════════════════════════════════════════════════════════════
// POST /api/generate  — main AI generation endpoint
// Body: { sys, userMsg, maxTokens }
// Returns: { text }
// ═══════════════════════════════════════════════════════════════
app.post(’/api/generate’, async (req, res) => {
const { sys, userMsg, maxTokens = 900 } = req.body;

if (!sys || !userMsg) {
return res.status(400).json({ error: ‘Missing sys or userMsg in request body’ });
}

const GEMINI_KEY    = process.env.GEMINI_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_KEY    = process.env.OPENAI_API_KEY;

// Try providers in order: Gemini → Anthropic → OpenAI
const errors = [];

// ── Gemini ──────────────────────────────────────────────────
if (GEMINI_KEY) {
try {
const model  = ‘gemini-1.5-flash’;
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
const body   = {
contents: [{ role: ‘user’, parts: [{ text: sys + ‘\n\n—\n\n’ + userMsg }] }],
generationConfig: { temperature: 1.0, maxOutputTokens: maxTokens }
};

```
  const r = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const d = await r.json();
  if (d.error) throw new Error('Gemini: ' + d.error.message);
  const text = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Gemini returned empty text');

  return res.json({ text, provider: 'gemini' });
} catch (e) {
  console.error('❌ Gemini error:', e.message);
  errors.push('Gemini: ' + e.message);
}
```

}

// ── Anthropic Claude ─────────────────────────────────────────
if (ANTHROPIC_KEY) {
try {
const r = await fetch(‘https://api.anthropic.com/v1/messages’, {
method: ‘POST’,
headers: {
‘Content-Type’: ‘application/json’,
‘x-api-key’: ANTHROPIC_KEY,
‘anthropic-version’: ‘2023-06-01’
},
body: JSON.stringify({
model: ‘claude-haiku-4-5-20251001’,
max_tokens: maxTokens,
system: sys,
messages: [{ role: ‘user’, content: userMsg }]
})
});

```
  const d = await r.json();
  if (d.error) throw new Error('Anthropic: ' + d.error.message);
  const text = d.content?.[0]?.text?.trim();
  if (!text) throw new Error('Anthropic returned empty text');

  return res.json({ text, provider: 'anthropic' });
} catch (e) {
  errors.push('Anthropic: ' + e.message);
}
```

}

// ── OpenAI ───────────────────────────────────────────────────
if (OPENAI_KEY) {
try {
const r = await fetch(‘https://api.openai.com/v1/chat/completions’, {
method: ‘POST’,
headers: {
‘Content-Type’: ‘application/json’,
‘Authorization’: ’Bearer ’ + OPENAI_KEY
},
body: JSON.stringify({
model: ‘gpt-4o-mini’,
max_tokens: maxTokens,
messages: [
{ role: ‘system’, content: sys },
{ role: ‘user’,   content: userMsg }
]
})
});

```
  const d = await r.json();
  if (d.error) throw new Error('OpenAI: ' + d.error.message);
  const text = d.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenAI returned empty text');

  return res.json({ text, provider: 'openai' });
} catch (e) {
  errors.push('OpenAI: ' + e.message);
}
```

}

// No keys configured or all failed
if (!GEMINI_KEY && !ANTHROPIC_KEY && !OPENAI_KEY) {
return res.status(500).json({ error: ‘No API keys configured on server. Add GEMINI_API_KEY to your .env file.’ });
}

console.error(‘❌ All providers failed:’, errors.join(’ | ’));
return res.status(500).json({ error: ‘All AI providers failed: ’ + errors.join(’ | ’) });
});

// ── Simple hash (same as client-side) ──
function simpleHash(str){
let h = 0;
for(let i=0;i<str.length;i++){ h=((h<<5)-h)+str.charCodeAt(i); h|=0; }
return Math.abs(h).toString(16);
}

// ── Health check — also exposes PIN hash so client can verify ──
app.get(’/api/health’, (req, res) => {
const pin = process.env.APP_PIN;
res.json({
status: ‘ok’,
pinHash: pin ? simpleHash(pin) : null,
providers: {
gemini:    !!process.env.GEMINI_API_KEY,
anthropic: !!process.env.ANTHROPIC_API_KEY,
openai:    !!process.env.OPENAI_API_KEY
}
});
});

// ── Catch-all → serve index.html (SPA support) ──
app.get(’*’, (req, res) => {
// Try public/index.html first, then root index.html
const publicPath = path.join(__dirname, ‘public’, ‘index.html’);
const rootPath   = path.join(__dirname, ‘index.html’);
const fs = require(‘fs’);
if (fs.existsSync(publicPath)) {
res.sendFile(publicPath);
} else if (fs.existsSync(rootPath)) {
res.sendFile(rootPath);
} else {
res.status(404).send(‘index.html not found. Check your deployment files.’);
}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log(`\n🎬 Pradeep Parmar Creator Studio running on http://localhost:${PORT}`);
console.log(`   Gemini key:    ${process.env.GEMINI_API_KEY    ? '✅ configured' : '❌ not set'}`);
console.log(`   Anthropic key: ${process.env.ANTHROPIC_API_KEY ? '✅ configured' : '❌ not set'}`);
console.log(`   OpenAI key:    ${process.env.OPENAI_API_KEY    ? '✅ configured' : '❌ not set'}\n`);
});