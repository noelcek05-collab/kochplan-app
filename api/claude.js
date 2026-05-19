// Serverless Function (Vercel) — hält deinen API-Key sicher auf dem Server.
// Der Browser ruft NUR diese Funktion auf, niemals Anthropic direkt.
// Dein Key steht als Umgebungsvariable ANTHROPIC_API_KEY in den Vercel-Settings,
// niemals im Code.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Nur POST erlaubt' });
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(500).json({ error: 'API-Key nicht konfiguriert. Setze ANTHROPIC_API_KEY in den Vercel Environment Variables.' });
  }
  if (!apiKey.startsWith('sk-ant-')) {
    return res.status(500).json({ error: 'API-Key sieht falsch aus (beginnt nicht mit sk-ant-). Bitte in Vercel Environment Variables prüfen.' });
  }

  try {
    const { messages, system, max_tokens } = req.body;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: max_tokens || 1500,
        system,
        messages,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      const detail = data?.error?.message || JSON.stringify(data?.error || data) || `HTTP ${r.status}`;
      return res.status(r.status).json({ error: `Anthropic-Fehler (${r.status}): ${detail}` });
    }

    const text = data?.content?.[0]?.text || '';
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: 'Serverfehler: ' + (e?.message || 'unbekannt') });
  }
}
