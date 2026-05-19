import { useState, useEffect, useRef } from "react";
import { Plus, Minus, X, Send, Sparkles, Loader2, ArrowLeft, ChefHat, ShoppingBag, MessageCircle, RefreshCw, Clock, Zap, CalendarDays, Repeat, AlertCircle, Check, Settings2, Wine } from "lucide-react";

/* ═══════════ CONTEXT BUILDER ═══════════ */

function ctxLine(s) {
  const stil = {
    alltag: 'Stil: ALLTAGSKÜCHE — einfache sättigende Klassiker (Pasta, Schnitzel, Hackgerichte, Bratkartoffeln). Keine ausgefallenen Techniken.',
    gemischt: 'Stil: GEMISCHT — meistens solide Klassiker, 1-2x etwas Besonderes zum Lernen.',
    kulinarisch: 'Stil: KULINARISCH — klassische europäische Techniken lernen (Saucen ziehen, ablöschen, reduzieren). Anspruchsvoller aber glasklar erklärt.'
  }[s.style];
  const aufwand = { schnell: 'Aufwand: max ~25 Min.', normal: 'Aufwand: 30–45 Min.', lang: 'Aufwand: bis ~60 Min erlaubt.' }[s.effort];
  return `Nutzer: Student Amsterdam, kauft bei Albert Heijn (NL), KEIN Tiefkühler.
GERÄTE: nur Pfannen, Kochtöpfe, Airfryer, Optigrill. KEIN Ofen, KEIN Schmortopf.
${s.cookDays} Koch-Tage, ${s.portions} Portionen/Kochvorgang (großzügig, NIEMALS Diätportionen). Jedes Gericht = 2 Mahlzeiten.
${stil} ${aufwand}
Budget: HART max ${s.budgetEur}€ Gesamteinkauf. Preisreferenz AH-NL: Hackfleisch 500g ~€4, Hähnchen 600g ~€6, Lachs 2 Stück ~€7, Pasta 500g ~€1.50, Sahne 250ml ~€1.80, Käse 200g ~€3, Champignons 250g ~€1.80, Paprika ~€1/Stück. NL ist teurer als DE, lieber 10-15% Aufschlag einrechnen.
NIEMALS: ${s.exclude.join(', ')}.
Vorräte (nicht einkaufen): ${s.pantry.length ? s.pantry.join(', ') : 'keine'}.${s.leftovers ? ` Noch übrig: ${s.leftovers} — einplanen, nicht nochmals kaufen.` : ''}`;
}

function recipeCtx(s) {
  return `Nutzer kocht: ${s.portions} Portionen für 2 Mahlzeiten. KEIN Ofen, KEIN Schmortopf — nur Pfannen, Töpfe, Airfryer, Optigrill.
NIEMALS diese Zutaten verwenden: ${s.exclude.join(', ')}. Auch nicht in Spuren oder als optionale Zugabe.`;
}

/* ═══════════ PROMPTS ═══════════ */

const P = {
  bundle: (s, wish) => `${ctxLine(s)}

Erstelle ${s.cookDays} abgestimmte Gerichte. Zutaten-Logik: Packungen aufbrauchen, verderbliches früh einplanen.
BUDGET STRIKT: schaetzkosten MUSS unter ${s.budgetEur}€ bleiben. Wenn Wünsche/Angebote das Budget sprengen würden, nur das Günstigste davon nehmen oder weglassen.
KREATIVITÄT: Abwechslung ist Pflicht. Nicht 2x dasselbe Protein. Mix aus Klassikern UND weniger bekannten aber leckeren Gerichten (Shakshuka, Gnocchi-Pfanne, Tortellini-Suppe, Piadina, Rösti, Gyros-Pfanne, Blumenkohl-Steaks, Halloumi-Pfanne, Linsen-Dal, Ramen, Okonomiyaki...). Denke kreativ — es gibt viele günstige, schnelle Gerichte die kaum jemand kennt aber jeder mag.
VORRÄTE: (${s.pantry.join(', ')}) immer vorhanden — nicht einkaufen. Übrige Zutaten (falls angegeben) einplanen wenn sinnvoll, aber Gerichte sollen eigenständig und lecker sein, nicht ums Aufbrauchen herum gebaut.
${wish ? `WUNSCH (als INSPIRATION, nicht als Pflicht): "${wish}" — lass dich davon inspirieren, aber übertreibe nicht. Wenn z.B. eine Zutat im Angebot ist: max 1-2 Gerichte damit, nicht alle. Wenn eine Küche gewünscht wird: 1-2 Gerichte in diese Richtung, Rest bleibt gemischt. Freiheit > Wörtlichkeit.` : ''}

NUR JSON:
{"schaetzkosten":28,"abfall":"...","einkauf_hinweis":"...","gerichte":[{"id":"g1","name":"...","beschreibung":"...","min":30,"hauptzutaten":["..."],"wein":null,"reihenfolge":1,"hinweis":"..."}]}`,

  swap: (s, others, dishName) => `${ctxLine(s)}
Tausche "${dishName}" gegen ein komplett ANDERES Gericht.
REGELN:
- Das neue Gericht muss EIGENSTÄNDIG sein — es darf KEINE Reste oder übrig gebliebenen Zutaten von den anderen Gerichten voraussetzen.
- Wenn möglich: teile eine frische Zutat mit einem anderen Gericht (z.B. beide brauchen Sahne oder Zwiebeln) — aber NUR wenn das sauber aufgeht, nicht erzwingen.
- Wenn keine sinnvolle Überschneidung möglich ist: lieber ein eigenständiges, leckeres Gericht als eines das auf Reste baut.
- Wenn die anderen Gerichte schon viel Hack/Hähnchen/etc. haben: ANDERES Protein oder vegetarisch wählen.
- Andere Gerichte diese Woche (nur zur Info, keine Pflicht sich anzupassen): ${others}
- Budget: Gesamtplan bleibt unter ${s.budgetEur}€.
NUR JSON: {"id":"GLEICHE_ID","name":"...","beschreibung":"...","min":30,"hauptzutaten":["..."],"wein":null,"reihenfolge":GLEICHE_ZAHL,"hinweis":"..."}`,

  recipe: (s, dish) => `${recipeCtx(s)}
Rezept für "${dish.name}" — ${s.portions} Portionen, für 2 Mahlzeiten gekocht.

Struktur GENAU so (wie ein professionelles Kochportal):

**Zutaten** (${s.portions} Portionen / 2 Mahlzeiten)
• Menge Zutat

**Vorbereitung** *(weglassen wenn nicht nötig)*
• Was vor dem Kochen erledigt wird: Schneiden, Abmessen, Marinieren etc.
• z.B. "Zwiebel in feine Würfel schneiden" / "Fleisch aus dem Kühlschrank nehmen, Zimmertemperatur"

**Zubereitung**
Nummerierte Schritte — EINE Aktion pro Schritt, kurz und klar.
Jeder Schritt enthält was relevant ist:
- Hitze (z.B. "mittlere Hitze", "hohe Hitze")
- Öl/Fett wenn neu dazukommt (z.B. "2 EL Öl erhitzen")  
- Genau was rein kommt
- Zeit + Erkennungsmerkmal (z.B. "3–4 Min, bis die Zwiebeln glasig und leicht goldbraun sind")

Beispiel für guten Schritt: "3. Hitze auf mittel reduzieren. Sahne angießen, Senf einrühren. 2–3 Min köcheln lassen bis die Sauce leicht eindickt und cremig wird."
${dish.wein ? `\n**Wein:** ${dish.wein}` : ''}
**Reste:** Abkühlen lassen, abgedeckt in den Kühlschrank (hält 1–2 Tage). Nächsten Tag: Pfanne auf mittlere Hitze, Reste rein, Schuss Wasser dazu, Deckel drauf, 3–4 Min warm werden lassen.`,

  shop: (s, dishes) => `Einkaufszettel für: ${dishes}.
Nutzer kauft bei AH in Amsterdam (NL). Mengen in AH-Packungsgrößen. ALLE Namen auf DEUTSCH.
NICHT auf die Liste: ${s.pantry.join(', ')}.${s.leftovers ? ` Bereits vorhanden: ${s.leftovers}.` : ''}
Gleiche Zutaten zusammenfassen. Kategorien mit Emoji: 🥩 Fleisch/Fisch · 🥦 Gemüse · 🥛 Kühlregal · 🍝 Trocken/Konserven · 🧂 Gewürze · 🍷 Wein
Kein Intro, direkt die Liste.`,

  today: (s, plan, dayName) => `Heute ${dayName}. Wochenplan (✓=gekocht): ${plan}. ${s.portions} Portionen/Kochvorgang.
Was soll heute gekocht werden? Max 3 kurze Sätze, locker, Deutsch. Erwähne Reste-Nutzung wenn sinnvoll.`,

  emergency: (s, plan) => `Notfall, keine Zeit. Plan: ${plan}. Vorräte: ${s.pantry.join(', ')}.
EIN Gericht max 15 Min aus wahrscheinlich vorhandenen Zutaten. Max 3 Sätze, direkt, Deutsch.`,

  rescue: (s, plan) => `Wochenplan retten. Plan: ${plan}.
Problem des Nutzers konkret lösen. Falls Gericht getauscht werden sollte: passendes vorschlagen. Locker, kompakt, Deutsch.`,

  cookChat: (s, dish) => `Nutzer kocht "${dish.name}" (${s.portions} Portionen, Geräte: Pfanne/Topf/Airfryer/Optigrill, kein Ofen). Frage beantworten: sehr kurz, praktisch, Deutsch.`,
};

/* ═══════════ API ═══════════ */

async function callClaude(messages, system, maxTokens = 1600) {
  try {
    const r = await fetch('/api/claude', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_tokens: maxTokens, system, messages })
    });
    const d = await r.json();
    if (!r.ok) return { error: d?.error || 'Fehler beim Laden.' };
    return { text: d.text || '' };
  } catch { return { error: 'Verbindungsfehler. Bitte erneut versuchen.' }; }
}
const parseJSON = t => { try { const m = t.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null; } catch { return null; } };

/* ═══════════ STORAGE ═══════════ */

const store = {
  get(k) { try { const v = localStorage.getItem('kp3:' + k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem('kp3:' + k, JSON.stringify(v)); } catch {} },
};

/* ═══════════ MARKDOWN ═══════════ */

function renderInline(t, k = '') {
  return t.split(/(\*\*.+?\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={k + i} style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.slice(2, -2)}</strong>
      : <span key={k + i}>{p}</span>);
}
function MD({ text }) {
  if (!text) return null;
  return <div style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--ink-2)', fontFamily: 'var(--font-body)' }}>
    {text.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} style={{ height: '.4rem' }} />;
      const num = line.match(/^(\d+)\.\s(.+)/);
      if (num) return <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 8, alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--accent)', fontWeight: 500, minWidth: 24, flexShrink: 0 }}>{num[1]}.</span>
        <span style={{ flex: 1 }}>{renderInline(num[2], `${i}-`)}</span></div>;
      if (/^[•\-]\s/.test(line)) return <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 5 }}>
        <span style={{ color: 'var(--accent)', flexShrink: 0, fontWeight: 600 }}>·</span>
        <span style={{ flex: 1 }}>{renderInline(line.replace(/^[•\-]\s/, ''), `${i}-`)}</span></div>;
      const head = line.startsWith('**') || /^[🥩🥦🥛🍝🍷🧂]/.test(line);
      return <p key={i} style={{ margin: head ? '14px 0 6px' : '0 0 4px', fontFamily: head ? 'var(--font-display)' : 'var(--font-body)', fontWeight: head ? 500 : 400, fontSize: head ? 16 : 14.5, color: head ? 'var(--ink)' : 'var(--ink-2)' }}>{renderInline(line, `${i}-`)}</p>;
    })}
  </div>;
}

/* ═══════════ THEME ═══════════ */

function useDark() {
  const [d, setD] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setD(mq.matches);
    const h = e => setD(e.matches); mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return d;
}


/* THEME HOLDER + HELPERS (module scope, stable) */
const TH = { C:{}, dark:true, tab:'plan', setTab:()=>{}, setActive:()=>{} };

const Btn = ({ onClick, disabled, children, primary, small, style = {} }) => (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily: 'var(--font-body)', fontSize: small ? 12.5 : 13.5, fontWeight: 500,
      padding: small ? '7px 13px' : '10px 17px', borderRadius: 100,
      border: primary ? 'none' : `1px solid ${TH.C.bd}`, background: primary ? TH.C.acc : TH.C.surf,
      color: primary ? '#FFF' : TH.C.ink, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, transition: 'all .15s', whiteSpace: 'nowrap',
      display: 'inline-flex', alignItems: 'center', gap: 6, ...style
    }}>{children}</button>
  );
const Seg = ({ value, set, opts }) => (
    <div style={{ display: 'flex', gap: 4, background: TH.C.surf2, padding: 4, borderRadius: 100, flexWrap: 'wrap' }}>
      {opts.map(([v, l]) => (
        <button key={v} onClick={() => set(v)} style={{
          flex: '1 1 auto', padding: '7px 12px', border: 'none', borderRadius: 100, cursor: 'pointer',
          background: value === v ? TH.C.surf : 'transparent', color: value === v ? TH.C.ink : TH.C.ink3,
          fontSize: 12.5, fontFamily: 'var(--font-body)', fontWeight: 500, transition: 'all .15s',
          boxShadow: value === v ? (TH.dark ? '0 1px 4px rgba(0,0,0,.3)' : '0 1px 4px rgba(0,0,0,.06)') : 'none', whiteSpace: 'nowrap'
        }}>{l}</button>
      ))}
    </div>
  );
const Stepper = ({ v, set, min, max, step = 1, suffix = '' }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={() => set(Math.max(min, v - step))} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: TH.C.surf2, color: TH.C.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={14} /></button>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 500, minWidth: suffix ? 44 : 22, textAlign: 'center', color: TH.C.ink }}>{v}{suffix}</span>
      <button onClick={() => set(Math.min(max, v + step))} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: TH.C.surf2, color: TH.C.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} /></button>
    </div>
  );
const Field = ({ label, children }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, color: TH.C.ink3, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 9 }}>{label}</div>
      {children}
    </div>
  );
const Card = ({ children, style = {}, className }) => (
    <div className={className} style={{ background: TH.C.surf, border: `1px solid ${TH.C.bd}`, borderRadius: 16, padding: '20px 22px', ...style }}>{children}</div>
  );
const Tab = ({ id, label, Icon }) => (
    <button onClick={() => { TH.setTab(id); TH.setActive(null); }} style={{
      flex: 1, padding: '9px 4px', border: 'none', background: 'transparent', cursor: 'pointer',
      color: TH.tab === id ? TH.C.ink : TH.C.ink3, fontSize: 11, fontFamily: 'var(--font-body)', fontWeight: 500,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative', transition: 'color .15s'
    }}>
      <Icon size={18} strokeWidth={TH.tab === id ? 2.2 : 1.7} />
      <span>{label}</span>
      {TH.tab === id && <div style={{ position: 'absolute', bottom: -1, left: '22%', right: '22%', height: 2, background: TH.C.acc, borderRadius: 2 }} />}
    </button>
  );
const ChatBox = ({ msgs, loading, input, setInput, send, placeholder, hint, endRef, minH = 200 }) => (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, minHeight: minH, marginBottom: 12 }}>
        {msgs.length === 0 && <div style={{ textAlign: 'center', padding: '28px 16px', color: TH.C.ink3, fontSize: 13, fontStyle: 'italic', fontFamily: 'var(--font-display)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{hint}</div>}
        {msgs.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%',
            background: m.role === 'user' ? TH.C.accSoft : TH.C.surf, color: m.role === 'user' ? TH.C.accInk : TH.C.ink,
            border: m.role === 'user' ? 'none' : `1px solid ${TH.C.bd}`,
            borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px', padding: '11px 15px', fontSize: 14, lineHeight: 1.55
          }}>{m.role === 'user' ? m.content : <MD text={m.content} />}</div>
        ))}
        {loading && <div style={{ alignSelf: 'flex-start', background: TH.C.surf, border: `1px solid ${TH.C.bd}`, borderRadius: '4px 14px 14px 14px', padding: '11px 15px', fontSize: 13, color: TH.C.ink3, fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>schreibt…</div>}
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={placeholder} rows={2} style={{ flex: 1, resize: 'none', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, padding: '11px 14px', borderRadius: 10, border: `1px solid ${TH.C.bd}`, background: TH.C.surf, color: TH.C.ink, outline: 'none' }} />
        {Btn({ onClick: send, disabled: !input.trim() || loading, primary: true, style: { padding: '11px 15px' }, children: <Send size={14} /> })}
      </div>
    </div>
  );

/* ═══════════ APP ═══════════ */

export default function App() {
  const [tab, setTab] = useState('plan');
  const [hydrated, setHydrated] = useState(false);
  const dark = useDark();

  const [cookDays, setCookDays] = useState(4);
  const [style, setStyle] = useState('gemischt');
  const [effort, setEffort] = useState('normal');
  const [budgetEur, setBudgetEur] = useState(30);
  const [portions, setPortions] = useState(2);
  const [exclude, setExclude] = useState(['Knoblauch', 'Oliven']);
  const [exInput, setExInput] = useState('');
  const [wish, setWish] = useState('');
  const [leftovers, setLeftovers] = useState('');
  const [pantry, setPantry] = useState(['Salz', 'Pfeffer', 'Öl', 'Zucker']);
  const [pantryInput, setPantryInput] = useState('');

  const [bundle, setBundle] = useState(null);
  const [done, setDone] = useState({});
  const [genLoad, setGenLoad] = useState(false);
  const [genErr, setGenErr] = useState('');
  const [swapId, setSwapId] = useState(null);

  const [active, setActive] = useState(null);
  const [recipes, setRecipes] = useState({});
  const [recLoad, setRecLoad] = useState(false);
  const [cookMsgs, setCookMsgs] = useState([]);
  const [cookInput, setCookInput] = useState('');
  const [cookLoad, setCookLoad] = useState(false);

  const [shop, setShop] = useState('');
  const [shopLoad, setShopLoad] = useState(false);

  const [todayMsg, setTodayMsg] = useState('');
  const [todayLoad, setTodayLoad] = useState(false);
  const [emMsg, setEmMsg] = useState('');
  const [emLoad, setEmLoad] = useState(false);

  const [rescueMsgs, setRescueMsgs] = useState([]);
  const [rescueInput, setRescueInput] = useState('');
  const [rescueLoad, setRescueLoad] = useState(false);
  const rescueEnd = useRef(null);
  const cookEnd = useRef(null);

  const settings = { cookDays, style, effort, budgetEur, portions, exclude, leftovers, pantry };

  useEffect(() => {
    if (!document.querySelector('link[data-kp3]')) {
      const l = document.createElement('link');
      l.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';
      l.rel = 'stylesheet'; l.dataset.kp3 = '1'; document.head.appendChild(l);
    }
    const g = store.get.bind(store);
    if (g('cookDays') != null) setCookDays(g('cookDays'));
    if (g('style')) setStyle(g('style'));
    if (g('effort')) setEffort(g('effort'));
    if (g('budgetEur') != null) setBudgetEur(g('budgetEur'));
    if (g('portions') != null) setPortions(g('portions'));
    if (g('exclude')) setExclude(g('exclude'));
    if (g('pantry')) setPantry(g('pantry'));
    if (g('leftovers')) setLeftovers(g('leftovers'));
    if (g('bundle')) setBundle(g('bundle'));
    if (g('done')) setDone(g('done'));
    if (g('recipes')) setRecipes(g('recipes'));
    if (g('shop')) setShop(g('shop'));
    if (g('rescueMsgs')) setRescueMsgs(g('rescueMsgs'));
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) store.set('cookDays', cookDays); }, [cookDays, hydrated]);
  useEffect(() => { if (hydrated) store.set('style', style); }, [style, hydrated]);
  useEffect(() => { if (hydrated) store.set('effort', effort); }, [effort, hydrated]);
  useEffect(() => { if (hydrated) store.set('budgetEur', budgetEur); }, [budgetEur, hydrated]);
  useEffect(() => { if (hydrated) store.set('portions', portions); }, [portions, hydrated]);
  useEffect(() => { if (hydrated) store.set('exclude', exclude); }, [exclude, hydrated]);
  useEffect(() => { if (hydrated) store.set('pantry', pantry); }, [pantry, hydrated]);
  useEffect(() => { if (hydrated) store.set('bundle', bundle); }, [bundle, hydrated]);
  useEffect(() => { if (hydrated) store.set('done', done); }, [done, hydrated]);
  useEffect(() => { if (hydrated) store.set('recipes', recipes); }, [recipes, hydrated]);
  useEffect(() => { if (hydrated) store.set('shop', shop); }, [shop, hydrated]);
  useEffect(() => { if (hydrated) store.set('rescueMsgs', rescueMsgs); }, [rescueMsgs, hydrated]);
  useEffect(() => { rescueEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [rescueMsgs, rescueLoad]);
  useEffect(() => { cookEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [cookMsgs, cookLoad]);

  useEffect(() => {
    if (!active || recipes[active.id]) return;
    let dead = false;
    setRecLoad(true);
    callClaude([{ role: 'user', content: P.recipe(settings, active) }], 'Du bist ein präziser Koch-Assistent. Antworte nur mit dem Rezept im geforderten Format. Schreibe das Rezept VOLLSTÄNDIG bis zum Ende, brich niemals mitten im Rezept ab.', 3500)
      .then(r => { if (dead) return; if (r.text) setRecipes(p => ({ ...p, [active.id]: r.text })); setRecLoad(false); });
    return () => { dead = true; };
  }, [active?.id]);

  const planSummary = () => bundle ? bundle.gerichte.map(g => `${done[g.id] ? '✓' : '○'} ${g.name} (${g.hauptzutaten.join('/')})`).join('; ') : 'noch kein Plan';

  const generate = async () => {
    if (genLoad) return;
    setGenLoad(true); setGenErr('');
    const r = await callClaude([{ role: 'user', content: P.bundle(settings, wish.trim()) }], 'Du gibst nur valides JSON zurück, keine Erklärung.', 2000);
    if (r.error) { setGenErr(r.error); setGenLoad(false); return; }
    const j = parseJSON(r.text);
    if (!j || !j.gerichte) { setGenErr('Konnte keinen Plan erstellen. Nochmal versuchen.'); setGenLoad(false); return; }
    setBundle(j); setDone({}); setRecipes({}); setShop(''); setGenLoad(false);
  };

  const swap = async (dish) => {
    if (swapId) return;
    setSwapId(dish.id);
    const others = bundle.gerichte.filter(g => g.id !== dish.id).map(g => `${g.name} (${g.hauptzutaten.join('/')})`).join(', ');
    const r = await callClaude([{ role: 'user', content: P.swap(settings, others, dish.name) }], 'Du gibst nur valides JSON zurück.', 700);
    const j = r.text ? parseJSON(r.text) : null;
    if (j && j.name) {
      setBundle(b => ({ ...b, gerichte: b.gerichte.map(g => g.id === dish.id ? { ...j, id: dish.id, reihenfolge: dish.reihenfolge } : g) }));
      setRecipes(p => { const n = { ...p }; delete n[dish.id]; return n; });
    }
    setSwapId(null);
  };

  const genShop = async () => {
    if (shopLoad || !bundle) return;
    setShopLoad(true); setShop('');
    const r = await callClaude([{ role: 'user', content: P.shop(settings, bundle.gerichte.map(g => g.name).join(', ')) }], 'Du erstellst Einkaufslisten. Nur die Liste.', 1400);
    setShop(r.text || r.error); setShopLoad(false);
  };

  const askToday = async () => {
    if (todayLoad || !bundle) return;
    setTodayLoad(true); setTodayMsg('');
    const dn = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][new Date().getDay()];
    const r = await callClaude([{ role: 'user', content: P.today(settings, planSummary(), dn) }], 'Knapp, motivierend, Deutsch.', 500);
    setTodayMsg(r.text || r.error); setTodayLoad(false);
  };
  const askEmergency = async () => {
    if (emLoad) return;
    setEmLoad(true); setEmMsg('');
    const r = await callClaude([{ role: 'user', content: P.emergency(settings, planSummary()) }], 'Knapp, Deutsch.', 400);
    setEmMsg(r.text || r.error); setEmLoad(false);
  };

  const sendCook = async () => {
    const t = cookInput.trim(); if (!t || cookLoad) return;
    const nx = [...cookMsgs, { role: 'user', content: t }];
    setCookMsgs(nx); setCookInput(''); setCookLoad(true);
    const r = await callClaude(nx, P.cookChat(settings, active), 700);
    setCookMsgs([...nx, { role: 'assistant', content: r.text || r.error }]); setCookLoad(false);
  };
  const sendRescue = async () => {
    const t = rescueInput.trim(); if (!t || rescueLoad) return;
    const nx = [...rescueMsgs, { role: 'user', content: t }];
    setRescueMsgs(nx); setRescueInput(''); setRescueLoad(true);
    const r = await callClaude(nx, P.rescue(settings, planSummary()), 900);
    setRescueMsgs([...nx, { role: 'assistant', content: r.text || r.error }]); setRescueLoad(false);
  };

  const addEx = () => { const v = exInput.trim(); if (v && !exclude.includes(v)) setExclude(e => [...e, v]); setExInput(''); };

  const C = dark ? {
    bg: '#15120E', surf: '#1F1A14', surf2: '#241F18', ink: '#F5F1E8', ink2: '#C5BBA8', ink3: '#857B68',
    bd: '#2D2820', acc: '#E0816F', accSoft: '#2E1F1A', accInk: '#F5C7BC', ok: '#7FB069'
  } : {
    bg: '#FAF7F2', surf: '#FFFFFF', surf2: '#F4EFE6', ink: '#1A1A1A', ink2: '#5C5246', ink3: '#94897A',
    bd: '#E8E2D5', acc: '#B85342', accSoft: '#F5E8E4', accInk: '#7A2B1F', ok: '#5C8A3A'
  };
  const V = {
    '--bg': C.bg, '--surface': C.surf, '--ink': C.ink, '--ink-2': C.ink2, '--ink-3': C.ink3,
    '--border': C.bd, '--accent': C.acc, '--accent-soft': C.accSoft, '--accent-ink': C.accInk,
    '--font-display': "'Fraunces', Georgia, serif", '--font-body': "'Plus Jakarta Sans', system-ui, sans-serif"
  };
  TH.C = C; TH.dark = dark; TH.tab = tab; TH.setTab = setTab; TH.setActive = setActive;

  // helpers hoisted (module scope)


  if (!hydrated) return <div style={{ ...V, background: C.bg, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: C.acc }} /></div>;

  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ ...V, background: C.bg, minHeight: '100vh', fontFamily: 'var(--font-body)', color: C.ink }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}.fade{animation:fade .35s ease-out}*{box-sizing:border-box}textarea:focus{border-color:${C.acc}!important}`}</style>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 20px 110px' }}>

        <header style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, color: C.ink3, letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 4, fontWeight: 500 }}>{today} · Amsterdam</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 500, color: C.ink, margin: 0, letterSpacing: '-0.025em', lineHeight: 1 }}>
            Mein Kochplan<span style={{ color: C.acc, fontStyle: 'italic' }}>.</span>
          </h1>
        </header>

        <nav style={{ display: 'flex', background: C.surf, borderRadius: 14, border: `1px solid ${C.bd}`, padding: 4, marginBottom: 22, position: 'sticky', top: 8, zIndex: 10, boxShadow: dark ? '0 4px 14px rgba(0,0,0,.3)' : '0 4px 14px rgba(184,83,66,.06)' }}>
          <Tab id="plan" label="Plan" Icon={CalendarDays} />
          <Tab id="shop" label="Einkauf" Icon={ShoppingBag} />
          <Tab id="heute" label="Heute" Icon={ChefHat} />
          <Tab id="rescue" label="Plan retten" Icon={AlertCircle} />
        </nav>

        {active && (
          <div className="fade">
            <button onClick={() => { setActive(null); setCookMsgs([]); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: C.ink3, fontSize: 13, marginBottom: 16, padding: 0, fontFamily: 'var(--font-body)' }}><ArrowLeft size={14} /> Zurück</button>
            <Card style={{ marginBottom: 14 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 500, color: C.ink, margin: '0 0 8px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>{active.name}</h2>
              <p style={{ fontSize: 13.5, color: C.ink2, margin: '0 0 10px', fontStyle: 'italic', fontFamily: 'var(--font-display)', lineHeight: 1.5 }}>{active.beschreibung}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: C.ink3, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={12} /> {active.min} min</span>
                <span>·</span><span>{portions} Portionen · 2 Mahlzeiten</span>
                {active.wein && <><span>·</span><span style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.acc }}><Wine size={12} /> Wein nötig</span></>}
              </div>
              <div style={{ borderTop: `1px solid ${C.bd}`, paddingTop: 16, minHeight: 160 }}>
                {recLoad || !recipes[active.id]
                  ? <div style={{ textAlign: 'center', padding: '36px 16px', color: C.ink3 }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: C.acc }} /><p style={{ margin: '12px 0 0', fontSize: 13, fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>Rezept wird zubereitet…</p></div>
                  : <MD text={recipes[active.id]} />}
              </div>
              {recipes[active.id] && (
                <div style={{ borderTop: `1px solid ${C.bd}`, marginTop: 18, paddingTop: 16 }}>
                  <Btn onClick={() => setDone(d => ({ ...d, [active.id]: !d[active.id] }))} primary={!done[active.id]} style={done[active.id] ? { background: C.ok, color: '#fff', border: 'none', width: '100%', justifyContent: 'center' } : { width: '100%', justifyContent: 'center' }}>
                    {done[active.id] ? <><Check size={15} /> Gekocht — erledigt</> : <><Check size={15} /> Kochen erledigt</>}
                  </Btn>
                </div>
              )}
            </Card>
            <Card>
              <div style={{ fontSize: 12, color: C.ink3, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><MessageCircle size={13} /> Fragen beim Kochen</div>
              <ChatBox msgs={cookMsgs} loading={cookLoad} input={cookInput} setInput={setCookInput} send={sendCook} endRef={cookEnd} placeholder="z.B. Kann ich Sahne durch Crème fraîche ersetzen?" hint={"Frag mich was während du kochst —\nErsatzzutaten, Timing, Technik…"} minH={120} />
            </Card>
          </div>
        )}

        {!active && tab === 'plan' && (
          <div className="fade">
            <Card style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}><Settings2 size={15} style={{ color: C.acc }} /><span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: C.ink }}>Diese Woche einstellen</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span style={{ fontSize: 13.5, color: C.ink }}>Koch-Tage</span><Stepper v={cookDays} set={setCookDays} min={2} max={7} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span style={{ fontSize: 13.5, color: C.ink }}>Portionen / Kochvorgang</span><Stepper v={portions} set={setPortions} min={1} max={6} />
              </div>
              <Field label="Stil"><Seg value={style} set={setStyle} opts={[['alltag', 'Alltagsküche'], ['gemischt', 'Gemischt'], ['kulinarisch', 'Kulinarisch']]} /></Field>
              <Field label="Aufwand"><Seg value={effort} set={setEffort} opts={[['schnell', 'Schnell'], ['normal', 'Normal'], ['lang', 'Auch mal länger']]} /></Field>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span style={{ fontSize: 13.5, color: C.ink }}>Budget <span style={{ color: C.ink3, fontSize: 12 }}>(pro Einkauf)</span></span><Stepper v={budgetEur} set={setBudgetEur} min={10} max={70} step={5} suffix="€" />
              </div>
              <Field label="Nie verwenden (gespeichert)">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {exclude.map(x => (
                    <span key={x} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '4px 8px 4px 11px', background: C.surf2, color: C.ink2, borderRadius: 100 }}>
                      {x}<button onClick={() => setExclude(e => e.filter(i => i !== x))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.ink3, display: 'flex', padding: 0 }}><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={exInput} onChange={e => setExInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addEx(); }} placeholder="z.B. Pilze" style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 13, padding: '9px 13px', borderRadius: 10, border: `1px solid ${C.bd}`, background: C.surf, color: C.ink, outline: 'none' }} />
                  <Btn onClick={addEx} small>Hinzufügen</Btn>
                </div>
              </Field>
              <Field label="Standard-Vorräte (immer zuhause, gespeichert)">
                <div style={{ fontSize: 12, color: C.ink3, marginBottom: 8 }}>Werden nicht auf den Einkaufszettel gesetzt</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {pantry.map(x => (
                    <span key={x} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '4px 8px 4px 11px', background: C.surf2, color: C.ink2, borderRadius: 100 }}>
                      {x}<button onClick={() => setPantry(p => p.filter(i => i !== x))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.ink3, display: 'flex', padding: 0 }}><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={pantryInput} onChange={e => setPantryInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { const v = pantryInput.trim(); if (v && !pantry.includes(v)) setPantry(p => [...p, v]); setPantryInput(''); } }} placeholder="z.B. Mehl, Butter, Essig" style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 13, padding: '9px 13px', borderRadius: 10, border: `1px solid ${C.bd}`, background: C.surf, color: C.ink, outline: 'none' }} />
                  <Btn onClick={() => { const v = pantryInput.trim(); if (v && !pantry.includes(v)) setPantry(p => [...p, v]); setPantryInput(''); }} small>Hinzufügen</Btn>
                </div>
              </Field>
              <Field label="Noch übrig vom letzten Einkauf (optional)">
                <textarea value={leftovers} onChange={e => setLeftovers(e.target.value)} placeholder="z.B. halbe Zwiebel, Karotten, Becher Sahne noch da" rows={2} style={{ width: '100%', resize: 'none', fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.5, padding: '10px 13px', borderRadius: 10, border: `1px solid ${C.bd}`, background: C.surf, color: C.ink, outline: 'none' }} />
              </Field>
              <Field label="Wunsch diese Woche (optional)">
                <textarea value={wish} onChange={e => setWish(e.target.value)} placeholder="z.B. Hähnchen ist im Angebot · diese Woche asiatisch · letzte Woche schon Pasta" rows={2} style={{ width: '100%', resize: 'none', fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.5, padding: '10px 13px', borderRadius: 10, border: `1px solid ${C.bd}`, background: C.surf, color: C.ink, outline: 'none' }} />
              </Field>
              <Btn onClick={generate} disabled={genLoad} primary style={{ width: '100%', justifyContent: 'center', padding: '13px 0', fontSize: 14.5 }}>
                {genLoad ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Wird geplant…</> : <><Sparkles size={15} /> Woche generieren</>}
              </Btn>
              {genErr && <p style={{ color: C.acc, fontSize: 13, margin: '12px 0 0', textAlign: 'center' }}>{genErr}</p>}
            </Card>

            {bundle && (
              <div className="fade">
                <Card style={{ marginBottom: 14, background: C.surf2, border: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div><div style={{ fontSize: 11, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>Geschätzte Kosten</div><div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: C.ink }}>~{bundle.schaetzkosten}€</div></div>
                    <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>Verschwendung</div><div style={{ fontSize: 13, color: C.ok, fontWeight: 500, maxWidth: 200 }}>{bundle.abfall}</div></div>
                  </div>
                  {bundle.einkauf_hinweis && <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.bd}`, fontSize: 12.5, color: C.ink2, lineHeight: 1.5 }}>🛒 {bundle.einkauf_hinweis}</div>}
                </Card>
                {[...bundle.gerichte].sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)).map(g => (
                  <div key={g.id} style={{ background: C.surf, border: `1px solid ${done[g.id] ? C.ok : C.bd}`, borderRadius: 14, padding: '15px 17px', marginBottom: 9, opacity: done[g.id] ? 0.65 : 1, transition: 'all .2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div onClick={() => setActive(g)} style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          {done[g.id] && <Check size={15} style={{ color: C.ok, flexShrink: 0 }} />}
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16.5, fontWeight: 500, color: C.ink, letterSpacing: '-0.01em' }}>{g.name}</span>
                        </div>
                        <p style={{ fontSize: 13, color: C.ink2, margin: '0 0 9px', lineHeight: 1.5 }}>{g.beschreibung}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: C.ink3, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> {g.min}min</span>
                          {g.hauptzutaten.map(z => <span key={z} style={{ fontSize: 11, padding: '2px 8px', background: C.surf2, color: C.ink2, borderRadius: 100 }}>{z}</span>)}
                          {g.wein && <span style={{ fontSize: 11, padding: '2px 8px', background: C.accSoft, color: C.accInk, borderRadius: 100, display: 'flex', alignItems: 'center', gap: 3 }}><Wine size={10} /> Wein</span>}
                        </div>
                        {g.hinweis && <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 8, fontStyle: 'italic' }}>{g.hinweis}</div>}
                      </div>
                      <button onClick={() => swap(g)} disabled={swapId === g.id} style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', border: `1px solid ${C.bd}`, background: C.surf, cursor: swapId === g.id ? 'default' : 'pointer', color: C.ink3, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Gericht tauschen">
                        {swapId === g.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Repeat size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
                <Btn onClick={() => setTab('shop')} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}><ShoppingBag size={14} /> Zum Einkaufszettel</Btn>
              </div>
            )}
          </div>
        )}

        {!active && tab === 'shop' && (
          <div className="fade">
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: C.ink, margin: '0 0 2px', letterSpacing: '-0.02em' }}>Einkaufszettel</h2>
              <p style={{ fontSize: 13, color: C.ink3, margin: 0 }}>Albert Heijn · echte Packungsgrößen</p>
            </div>
            {!bundle ? (
              <Card><p style={{ margin: 0, fontSize: 13.5, color: C.ink3, fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>Noch kein Wochenplan. Geh auf „Plan" und generiere zuerst eine Woche.</p></Card>
            ) : (
              <>
                <Btn onClick={genShop} disabled={shopLoad} primary style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 14, marginBottom: 14 }}>
                  {shopLoad ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Zettel wird erstellt…</> : shop ? <><RefreshCw size={14} /> Neu erstellen</> : <><Sparkles size={14} /> Einkaufszettel erstellen</>}
                </Btn>
                {shop && !shopLoad && <Card className="fade"><MD text={shop} /></Card>}
              </>
            )}
          </div>
        )}

        {!active && tab === 'heute' && (
          <div className="fade">
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: C.ink, margin: '0 0 2px', letterSpacing: '-0.02em' }}>Was koche ich heute?</h2>
              <p style={{ fontSize: 13, color: C.ink3, margin: 0 }}>{bundle ? `${bundle.gerichte.filter(g => done[g.id]).length} von ${bundle.gerichte.length} gekocht` : 'Noch kein Plan'}</p>
            </div>
            {!bundle ? (
              <Card><p style={{ margin: 0, fontSize: 13.5, color: C.ink3, fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>Generiere zuerst eine Woche im „Plan"-Tab.</p></Card>
            ) : (
              <>
                <Card style={{ marginBottom: 14 }}>
                  <Btn onClick={askToday} disabled={todayLoad} primary style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 14, marginBottom: todayMsg ? 16 : 0 }}>
                    {todayLoad ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> …</> : <><ChefHat size={14} /> Was ist heute dran?</>}
                  </Btn>
                  {todayMsg && <div className="fade"><MD text={todayMsg} /></div>}
                </Card>
                <Card style={{ background: C.accSoft, border: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><Zap size={15} style={{ color: C.acc }} /><span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, color: C.ink }}>Notfall — keine Zeit/Lust</span></div>
                  <Btn onClick={askEmergency} disabled={emLoad} style={{ width: '100%', justifyContent: 'center', background: C.surf }}>
                    {emLoad ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> …</> : <><Zap size={14} /> Schnelle Rettung (max 15 Min)</>}
                  </Btn>
                  {emMsg && <div className="fade" style={{ marginTop: 14 }}><MD text={emMsg} /></div>}
                </Card>
              </>
            )}
          </div>
        )}

        {!active && tab === 'rescue' && (
          <div className="fade">
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: C.ink, margin: '0 0 2px', letterSpacing: '-0.02em' }}>Plan retten & Chat</h2>
              <p style={{ fontSize: 13, color: C.ink3, margin: 0 }}>Etwas schiefgelaufen? Sag's mir.</p>
            </div>
            <Card>
              <ChatBox msgs={rescueMsgs} loading={rescueLoad} input={rescueInput} setInput={setRescueInput} send={sendRescue} endRef={rescueEnd}
                placeholder="z.B. Zutat ist schlecht geworden · konnte gestern nicht kochen · Hähnchen war im Angebot"
                hint={"Probleme oder Änderungen?\nZutat schlecht · Tag gesprengt\nProdukt nicht bekommen · Angebot entdeckt"} minH={300} />
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
