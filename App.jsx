import { useState, useEffect, useRef } from "react";
import { Plus, Minus, X, Send, Sparkles, Loader2, ArrowLeft, ChefHat, ShoppingBag, BookOpen, MessageCircle, Trash2, GripVertical, RefreshCw, Clock } from "lucide-react";

/* ───────── Daten ───────── */

const BASE_DISHES = [
  { id:'d1',  name:'Hack & Bohnen',              cat:'schnell',    min:20, tags:['rind','zwi','pap','tom'], blurb:'Würzig, sättigend, Studenten-Favorit.' },
  { id:'d2',  name:'Pasta mit Speck & Sahne',     cat:'schnell',    min:20, tags:['rind','zwi','sah'],       blurb:'Cremig, schnell, lecker.' },
  { id:'d3',  name:'Rührei mit Paprika & Speck',  cat:'schnell',    min:15, tags:['rind','pap','zwi'],       blurb:'Frühstück oder Abendessen.' },
  { id:'d4',  name:'Pasta al Sugo',               cat:'schnell',    min:20, tags:['zwi','tom'],              blurb:'Italienisch, simpel, perfekt.' },
  { id:'d5',  name:'Steak Champignon-Rotwein',    cat:'mittel',     min:35, tags:['rind','cha','zwi','sah'], blurb:'Dein Lieblingsgericht, klassisch gemacht.' },
  { id:'d6',  name:'Philly Cheesesteak',          cat:'mittel',     min:35, tags:['rind','pap','zwi'],       blurb:'Amerikanisches Streetfood, herzhaft.' },
  { id:'d7',  name:'Schnitzel Zigeunersauce',     cat:'mittel',     min:40, tags:['cha','pap','zwi','tom'],  blurb:'Deutscher Klassiker mit Pep.' },
  { id:'d8',  name:'Hähnchen-Geschnetzeltes',     cat:'mittel',     min:35, tags:['cha','zwi','sah'],        blurb:'Schweizer Tradition, cremig.' },
  { id:'d9',  name:'Lachs Senf-Dill-Sahne',       cat:'mittel',     min:25, tags:['sah'],                    blurb:'Skandinavisch, elegant, schnell.' },
  { id:'d10', name:'Schweinemedaillons au Poivre',cat:'wochenende', min:45, tags:['sah'],                    blurb:'Französisches Bistro im Heimformat.' },
  { id:'d11', name:'Poulet Normand',              cat:'wochenende', min:50, tags:['zwi','sah'],              blurb:'Normandie auf dem Teller.' },
  { id:'d12', name:'Rindergulasch',               cat:'wochenende', min:75, tags:['rind','zwi','pap','tom'], blurb:'Schmoren, warten, genießen.' },
];

const TAGS = {
  rind:{l:'Rind/Speck', light:['#EEEDFE','#3C3489'], dark:['#26215C','#AFA9EC']},
  zwi: {l:'Zwiebeln',   light:['#FAEEDA','#633806'], dark:['#412402','#FAC775']},
  pap: {l:'Paprika',    light:['#FAECE7','#993C1D'], dark:['#4A1B0C','#F0997B']},
  cha: {l:'Champignons',light:['#EAF3DE','#3B6D11'], dark:['#173404','#97C459']},
  sah: {l:'Sahne',      light:['#E6F1FB','#185FA5'], dark:['#042C53','#85B7EB']},
  tom: {l:'Tomaten',    light:['#FCEBEB','#A32D2D'], dark:['#501313','#F09595']},
};

const CATS = {
  schnell:    {l:'Schnell',    t:'≤ 25 min'},
  mittel:     {l:'Mittel',     t:'30 – 45 min'},
  wochenende: {l:'Wochenende', t:'45 – 90 min'},
};

const DAYS = [
  ['mo','Montag'], ['di','Dienstag'], ['mi','Mittwoch'], ['do','Donnerstag'],
  ['fr','Freitag'], ['sa','Samstag'], ['so','Sonntag']
];

/* ───────── System Prompts ───────── */

const SYS_RECIPE = `Du bist ein präziser Koch-Assistent. Erstelle alltagstaugliche Rezepte für einen Studenten in den Niederlanden.
Regeln: Kein Knoblauch. Keine Oliven. Keine Trendzutaten (kein Bulgur, Quinoa, Matcha etc.). Klassisch europäisch (deutsch, französisch, italienisch).
Geräte: Pfannen, Töpfe, Airfryer, Optigrill.
Format auf Deutsch:
**Zutaten** (für X Portionen):
• Menge Zutat
**Zubereitung:**
1. Schritt — kurz und klar, mit Profi-Tipp wo sinnvoll
**Tipp:** Optional ein zusätzlicher Insider-Tipp.
Halte es praktisch und lecker.`;

const SYS_SHOP = `Du erstellst eine kombinierte Einkaufsliste. Fasse identische Zutaten zusammen. Supermarkt-freundliche Mengen (z.B. "1 Becher Sahne 200ml" statt "150ml Sahne").
Format mit diesen Kategorien (mit Emoji):
🥩 Fleisch & Fisch
🥦 Gemüse & Obst
🥛 Kühlregal
🍝 Trockenwaren
🧂 Gewürze & Sonstiges
Kein Intro, direkt mit den Kategorien starten. Auf Deutsch.`;

const SYS_CHAT = `Du bist ein freundlicher Koch-Assistent für einen Studenten in den Niederlanden.
Kontext: Klassisch europäische Küche, kein Knoblauch, keine Oliven, keine Trendzutaten. Geräte: Pfannen, Töpfe, Airfryer, Optigrill. Studentenfreundliches Budget.
Antworte locker, kompakt und auf Deutsch. Halte Antworten knackig — höchstens ein paar Absätze.`;

const SYS_NEW = `Du schlägst ein neues Gericht passend zur Bibliothek vor. Klassisch europäisch, kein Knoblauch, keine Oliven, keine Trendzutaten.
Antworte AUSSCHLIESSLICH mit einem JSON-Objekt in diesem Format (keine Erklärung drumherum):
{"name":"Name auf Deutsch","blurb":"Kurzer Satz auf Deutsch","cat":"schnell|mittel|wochenende","min":30,"tags":["rind","zwi","pap","cha","sah","tom"]}
Wähle aus den verfügbaren Tags nur die zutreffenden. min = Zubereitungszeit in Minuten. cat: schnell ≤25min, mittel 30-45min, wochenende 45-90min.`;

/* ───────── API Helper ───────── */

async function callClaude(messages, system) {
  try {
    const r = await fetch('/api/claude', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ max_tokens:1500, system, messages })
    });
    const d = await r.json();
    if (!r.ok) return d?.error || 'Fehler beim Laden der Antwort.';
    return d.text || 'Fehler beim Laden der Antwort.';
  } catch (e) {
    return 'Verbindungsfehler. Bitte erneut versuchen.';
  }
}

/* ───────── Storage Helper (localStorage) ───────── */

const store = {
  async get(key) {
    try {
      const v = localStorage.getItem('kochplan:' + key);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  async set(key, value) {
    try { localStorage.setItem('kochplan:' + key, JSON.stringify(value)); } catch {}
  }
};

/* ───────── Markdown Renderer ───────── */

function renderInline(text, key='') {
  return text.split(/(\*\*.+?\*\*)/g).map((p,i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={key+i} style={{fontWeight:600, color:'var(--ink)'}}>{p.slice(2,-2)}</strong>
      : <span key={key+i}>{p}</span>
  );
}

function MD({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div style={{fontSize:14.5, lineHeight:1.7, color:'var(--ink-2)', fontFamily:'var(--font-body)'}}>
      {lines.map((line,i) => {
        if (!line.trim()) return <div key={i} style={{height:'.45rem'}} />;
        const num = line.match(/^(\d+)\.\s(.+)/);
        if (num) return (
          <div key={i} style={{display:'flex', gap:14, marginBottom:8, alignItems:'baseline'}}>
            <span style={{fontFamily:'var(--font-display)', fontStyle:'italic', fontSize:18, color:'var(--accent)', fontWeight:500, minWidth:24, flexShrink:0, lineHeight:1}}>{num[1]}.</span>
            <span style={{flex:1}}>{renderInline(num[2], `${i}-`)}</span>
          </div>
        );
        if (/^[•\-]\s/.test(line)) return (
          <div key={i} style={{display:'flex', gap:10, marginBottom:5}}>
            <span style={{color:'var(--accent)', flexShrink:0, fontWeight:600}}>·</span>
            <span style={{flex:1}}>{renderInline(line.replace(/^[•\-]\s/,''), `${i}-`)}</span>
          </div>
        );
        const isBold = line.startsWith('**');
        return (
          <p key={i} style={{margin: isBold ? '14px 0 6px' : '0 0 4px', fontFamily: isBold?'var(--font-display)':'var(--font-body)', fontWeight: isBold?500:400, fontSize: isBold?16:14.5, color: isBold?'var(--ink)':'var(--ink-2)'}}>
            {renderInline(line, `${i}-`)}
          </p>
        );
      })}
    </div>
  );
}

/* ───────── Tag Component ───────── */

function Tag({ id, mode='light', size='sm' }) {
  const t = TAGS[id];
  if (!t) return null;
  const [bg, color] = mode === 'dark' ? t.dark : t.light;
  return (
    <span style={{
      fontSize: size === 'sm' ? 10.5 : 11.5,
      padding: size === 'sm' ? '2px 7px' : '3px 9px',
      borderRadius: 100,
      background: bg, color,
      fontWeight: 500,
      letterSpacing: '.01em',
      whiteSpace: 'nowrap',
      fontFamily:'var(--font-body)'
    }}>{t.l}</span>
  );
}

/* ───────── Theme Hook ───────── */

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setDark(mq.matches);
    const handler = (e) => setDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return dark;
}

/* ───────── Main App ───────── */

export default function App() {
  const [tab, setTab] = useState('plan');
  const [weekPlan, setWeekPlan] = useState({}); // {mo: dishId, ...}
  const [portions, setPortions] = useState(2);
  const [recipes, setRecipes] = useState({});
  const [shoppingList, setShoppingList] = useState('');
  const [chatMsgs, setChatMsgs] = useState([]);
  const [customDishes, setCustomDishes] = useState([]);
  const [activeDish, setActiveDish] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [askInput, setAskInput] = useState('');
  const [loading, setLoading] = useState({ recipe:false, shop:false, chat:false, ask:false });
  const [draggedDish, setDraggedDish] = useState(null);
  const [dragOverDay, setDragOverDay] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const dark = useDarkMode();
  const chatEndRef = useRef(null);

  /* ─── Load fonts + Hydrate from storage ─── */
  useEffect(() => {
    if (!document.querySelector('link[data-kochplan-fonts]')) {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';
      link.rel = 'stylesheet';
      link.dataset.kochplanFonts = 'true';
      document.head.appendChild(link);
    }
    (async () => {
      const [wp, p, c, r, cd, sl] = await Promise.all([
        store.get('weekPlan'), store.get('portions'), store.get('chatMsgs'),
        store.get('recipes'),  store.get('customDishes'), store.get('shoppingList'),
      ]);
      if (wp) setWeekPlan(wp);
      if (p)  setPortions(p);
      if (c)  setChatMsgs(c);
      if (r)  setRecipes(r);
      if (cd) setCustomDishes(cd);
      if (sl) setShoppingList(sl);
      setHydrated(true);
    })();
  }, []);

  /* ─── Persist state ─── */
  useEffect(() => { if (hydrated) store.set('weekPlan', weekPlan); }, [weekPlan, hydrated]);
  useEffect(() => { if (hydrated) store.set('portions', portions); }, [portions, hydrated]);
  useEffect(() => { if (hydrated) store.set('chatMsgs', chatMsgs); }, [chatMsgs, hydrated]);
  useEffect(() => { if (hydrated) store.set('recipes', recipes); }, [recipes, hydrated]);
  useEffect(() => { if (hydrated) store.set('customDishes', customDishes); }, [customDishes, hydrated]);
  useEffect(() => { if (hydrated) store.set('shoppingList', shoppingList); }, [shoppingList, hydrated]);

  /* ─── Scroll chat ─── */
  useEffect(() => { chatEndRef.current?.scrollIntoView({behavior:'smooth'}); }, [chatMsgs, loading.chat]);

  /* ─── Recipe loader ─── */
  useEffect(() => {
    if (!activeDish) return;
    const key = `${activeDish.id}-${portions}`;
    if (recipes[key]) return;
    let dead = false;
    setLoading(l => ({...l, recipe:true}));
    callClaude(
      [{ role:'user', content:`Erstelle ein Rezept für "${activeDish.name}" für ${portions} Portion${portions>1?'en':''}.` }],
      SYS_RECIPE
    ).then(t => {
      if (dead) return;
      setRecipes(r => ({...r, [key]: t}));
      setLoading(l => ({...l, recipe:false}));
    }).catch(() => {
      if (dead) return;
      setLoading(l => ({...l, recipe:false}));
    });
    return () => { dead = true; };
  }, [activeDish?.id, portions]);

  const allDishes = [...BASE_DISHES, ...customDishes];

  /* ─── Drag & Drop ─── */
  const onDragStart = (e, dish) => {
    setDraggedDish(dish);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', dish.id); } catch {}
  };
  const onDragEnd = () => { setDraggedDish(null); setDragOverDay(null); };
  const onDayOver = (e, day) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverDay(day); };
  const onDayLeave = () => setDragOverDay(null);
  const onDayDrop = (e, day) => {
    e.preventDefault();
    if (draggedDish) setWeekPlan(p => ({...p, [day]: draggedDish.id}));
    setDraggedDish(null); setDragOverDay(null);
  };
  const removeDayDish = (day) => setWeekPlan(p => { const n = {...p}; delete n[day]; return n; });
  const clearWeek = () => setWeekPlan({});

  /* ─── Actions ─── */
  const generateShopping = async () => {
    const dishes = Object.values(weekPlan).map(id => allDishes.find(d => d.id === id)).filter(Boolean);
    if (!dishes.length || loading.shop) return;
    setLoading(l => ({...l, shop:true}));
    setShoppingList('');
    const dishLines = dishes.map(d => `- ${d.name}`).join('\n');
    const t = await callClaude(
      [{ role:'user', content:`Erstelle eine Einkaufsliste für ${portions} Portionen je Gericht:\n${dishLines}` }],
      SYS_SHOP
    );
    setShoppingList(t);
    setLoading(l => ({...l, shop:false}));
  };

  const sendChat = async () => {
    const txt = chatInput.trim();
    if (!txt || loading.chat) return;
    const next = [...chatMsgs, { role:'user', content: txt }];
    setChatMsgs(next);
    setChatInput('');
    setLoading(l => ({...l, chat:true}));
    const t = await callClaude(next, SYS_CHAT);
    setChatMsgs([...next, { role:'assistant', content: t }]);
    setLoading(l => ({...l, chat:false}));
  };

  const askNewDish = async () => {
    const txt = askInput.trim();
    if (!txt || loading.ask) return;
    setLoading(l => ({...l, ask:true}));
    const t = await callClaude(
      [{ role:'user', content: `Schlage ein neues Gericht vor, beschrieben als: "${txt}"` }],
      SYS_NEW
    );
    try {
      const m = t.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        parsed.id = 'c' + Date.now();
        parsed.custom = true;
        setCustomDishes(d => [...d, parsed]);
        setAskInput('');
      }
    } catch {}
    setLoading(l => ({...l, ask:false}));
  };

  const deleteCustom = (id) => setCustomDishes(d => d.filter(x => x.id !== id));

  /* ─── Styles ─── */
  const C = dark ? {
    bg:'#15120E', surface:'#1F1A14', surface2:'#241F18',
    ink:'#F5F1E8', ink2:'#C5BBA8', ink3:'#857B68',
    border:'#2D2820', borderStrong:'#3A3328',
    accent:'#E0816F', accentSoft:'#2E1F1A', accentInk:'#F5C7BC',
  } : {
    bg:'#FAF7F2', surface:'#FFFFFF', surface2:'#F4EFE6',
    ink:'#1A1A1A', ink2:'#5C5246', ink3:'#94897A',
    border:'#E8E2D5', borderStrong:'#D6CDB9',
    accent:'#B85342', accentSoft:'#F5E8E4', accentInk:'#7A2B1F',
  };

  const cssVars = {
    '--bg': C.bg, '--surface': C.surface, '--surface-2': C.surface2,
    '--ink': C.ink, '--ink-2': C.ink2, '--ink-3': C.ink3,
    '--border': C.border, '--border-strong': C.borderStrong,
    '--accent': C.accent, '--accent-soft': C.accentSoft, '--accent-ink': C.accentInk,
    '--font-display': "'Fraunces', Georgia, serif",
    '--font-body': "'Plus Jakarta Sans', system-ui, sans-serif",
  };

  /* ─── Reusable Sub-components (using inline styles) ─── */
  const Btn = ({ onClick, disabled, children, primary, small, style={}, title }) => (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{
        fontFamily:'var(--font-body)', fontSize: small?12.5:13.5, fontWeight:500,
        padding: small?'6px 12px':'9px 16px', borderRadius:100,
        border: primary?'none':`1px solid ${C.border}`,
        background: primary ? C.accent : C.surface,
        color: primary ? '#FFF' : C.ink,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all .15s', whiteSpace:'nowrap',
        display:'inline-flex', alignItems:'center', gap:6,
        ...style,
      }}>{children}</button>
  );

  const IconBtn = ({ onClick, children, title }) => (
    <button onClick={onClick} title={title}
      style={{
        width:30, height:30, borderRadius:'50%', border:`1px solid ${C.border}`,
        background: C.surface, cursor:'pointer', display:'flex', alignItems:'center',
        justifyContent:'center', color: C.ink, transition:'border-color .15s',
      }}>{children}</button>
  );

  const DishChip = ({ dish, onClick, draggable, compact }) => {
    const dragging = draggedDish?.id === dish.id;
    return (
      <div
        draggable={draggable}
        onDragStart={draggable ? (e) => onDragStart(e, dish) : undefined}
        onDragEnd={draggable ? onDragEnd : undefined}
        onClick={onClick}
        style={{
          background: C.surface, border:`1px solid ${C.border}`,
          borderRadius: 12, padding: compact?'10px 12px':'14px 16px',
          cursor: onClick || draggable ? 'pointer' : 'default',
          transition:'all .18s', position:'relative',
          opacity: dragging ? 0.4 : 1,
          transform: dragging ? 'scale(0.97)' : 'scale(1)',
          minWidth: compact ? 160 : 'auto',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { if (onClick||draggable) e.currentTarget.style.borderColor = C.borderStrong; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
      >
        {draggable && (
          <div style={{position:'absolute', top:8, right:8, color:C.ink3, opacity:.5}}>
            <GripVertical size={14} />
          </div>
        )}
        <div style={{
          fontFamily:'var(--font-display)', fontSize: compact?14:15.5,
          fontWeight:500, color:C.ink, lineHeight:1.3, marginBottom:8,
          letterSpacing: '-0.01em',
        }}>{dish.name}</div>
        <div style={{display:'flex', alignItems:'center', gap:8, marginBottom: dish.tags?.length?8:0, fontSize:11.5, color:C.ink3, fontFamily:'var(--font-body)'}}>
          <Clock size={11} strokeWidth={2} />
          <span>{dish.min} min</span>
          {dish.custom && <span style={{
            fontSize:9.5, padding:'1px 6px', background:C.accentSoft, color:C.accentInk,
            borderRadius:100, fontWeight:600, letterSpacing:'.03em'
          }}>NEU</span>}
        </div>
        {dish.tags?.length > 0 && (
          <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
            {dish.tags.map(t => <Tag key={t} id={t} mode={dark?'dark':'light'} />)}
          </div>
        )}
      </div>
    );
  };

  const TabBtn = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => { setTab(id); setActiveDish(null); }}
      style={{
        flex:1, padding:'10px 8px', border:'none', background:'transparent',
        cursor:'pointer', color: tab===id ? C.ink : C.ink3,
        fontSize:12, fontFamily:'var(--font-body)', fontWeight:500,
        display:'flex', flexDirection:'column', alignItems:'center', gap:4,
        position:'relative', transition:'color .15s',
      }}
    >
      <Icon size={18} strokeWidth={tab===id ? 2.2 : 1.7} />
      <span>{label}</span>
      {tab===id && (
        <div style={{
          position:'absolute', bottom:-1, left:'25%', right:'25%', height:2,
          background: C.accent, borderRadius:2,
        }} />
      )}
    </button>
  );

  /* ───────── Render ───────── */

  if (!hydrated) {
    return (
      <div style={{...cssVars, background:C.bg, minHeight:300, display:'flex', alignItems:'center', justifyContent:'center', color:C.ink3, fontFamily:'system-ui'}}>
        <Loader2 size={20} style={{animation:'spin 1s linear infinite'}} />
      </div>
    );
  }

  const today = new Date().toLocaleDateString('de-DE', { weekday:'long', day:'numeric', month:'long' });
  const weekDishCount = Object.keys(weekPlan).length;

  return (
    <div style={{...cssVars, background:C.bg, minHeight:'100vh', fontFamily:'var(--font-body)', color: C.ink}}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeIn .35s ease-out; }
        .kp-input { font-family: var(--font-body); font-size: 14px; padding: 11px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--ink); width: 100%; outline: none; transition: border-color .15s; line-height: 1.5; }
        .kp-input:focus { border-color: var(--accent); }
        .kp-input::placeholder { color: var(--ink-3); }
        .kp-scroll::-webkit-scrollbar { height: 6px; }
        .kp-scroll::-webkit-scrollbar-track { background: transparent; }
        .kp-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 6px; }
      `}</style>

      <div style={{maxWidth: 760, margin:'0 auto', padding:'24px 20px 100px'}}>

        {/* ─── HEADER ─── */}
        <header style={{marginBottom: 24}}>
          <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:16, flexWrap:'wrap'}}>
            <div>
              <div style={{fontSize:11, color:C.ink3, letterSpacing:'.15em', textTransform:'uppercase', marginBottom:4, fontWeight:500}}>
                {today}
              </div>
              <h1 style={{
                fontFamily:'var(--font-display)', fontSize:34, fontWeight:500, color:C.ink,
                margin:0, letterSpacing:'-0.025em', lineHeight:1,
              }}>
                Mein Kochplan<span style={{color:C.accent, fontStyle:'italic', fontWeight:400}}>.</span>
              </h1>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:10, background:C.surface, padding:'6px 10px', borderRadius:100, border:`1px solid ${C.border}`}}>
              <span style={{fontSize:11.5, color:C.ink3, fontWeight:500, paddingLeft:6}}>Portionen</span>
              <button onClick={() => setPortions(p => Math.max(1, p-1))} style={{
                width:24, height:24, borderRadius:'50%', border:'none', background:C.surface2,
                color:C.ink, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              }}><Minus size={13} /></button>
              <span style={{fontFamily:'var(--font-display)', fontSize:16, fontWeight:500, color:C.ink, minWidth:14, textAlign:'center'}}>{portions}</span>
              <button onClick={() => setPortions(p => Math.min(8, p+1))} style={{
                width:24, height:24, borderRadius:'50%', border:'none', background:C.surface2,
                color:C.ink, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              }}><Plus size={13} /></button>
            </div>
          </div>
        </header>

        {/* ─── TAB NAV ─── */}
        <nav style={{
          display:'flex', background:C.surface, borderRadius:14, border:`1px solid ${C.border}`,
          padding:4, marginBottom:24, position:'sticky', top:8, zIndex:10,
          boxShadow: dark ? '0 4px 14px rgba(0,0,0,.3)' : '0 4px 14px rgba(184,83,66,.06)',
        }}>
          <TabBtn id="plan"    label="Wochenplan"   icon={ChefHat} />
          <TabBtn id="library" label="Bibliothek"   icon={BookOpen} />
          <TabBtn id="shop"    label="Einkaufen"    icon={ShoppingBag} />
          <TabBtn id="chat"    label="Chat"         icon={MessageCircle} />
        </nav>

        {/* ═══════════════ PLAN TAB ═══════════════ */}
        {tab === 'plan' && !activeDish && (
          <div className="fade-in">
            <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:14, gap:12, flexWrap:'wrap'}}>
              <div>
                <h2 style={{fontFamily:'var(--font-display)', fontSize:22, fontWeight:500, color:C.ink, margin:'0 0 2px', letterSpacing:'-0.02em'}}>Diese Woche</h2>
                <p style={{fontSize:13, color:C.ink3, margin:0}}>{weekDishCount === 0 ? 'Noch leer – zieh ein Gericht in einen Tag' : `${weekDishCount} von 7 Tagen geplant`}</p>
              </div>
              {weekDishCount > 0 && (
                <button onClick={clearWeek} style={{
                  background:'transparent', border:'none', color:C.ink3, fontSize:12,
                  cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontFamily:'var(--font-body)',
                }}>
                  <RefreshCw size={12} /> Woche leeren
                </button>
              )}
            </div>

            {/* DAY CARDS */}
            <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:32}}>
              {DAYS.map(([id, name]) => {
                const dishId = weekPlan[id];
                const dish = dishId ? allDishes.find(d => d.id === dishId) : null;
                const isOver = dragOverDay === id;
                return (
                  <div key={id}
                    onDragOver={(e) => onDayOver(e, id)}
                    onDragLeave={onDayLeave}
                    onDrop={(e) => onDayDrop(e, id)}
                    style={{
                      display:'flex', alignItems:'stretch', gap:12,
                      background: isOver ? C.accentSoft : C.surface,
                      border: `${isOver ? 2 : 1}px ${isOver ? 'dashed' : 'solid'} ${isOver ? C.accent : C.border}`,
                      borderRadius:14, padding: isOver ? '11px' : '12px', transition:'all .18s',
                      minHeight: 70,
                    }}>
                    <div style={{
                      width:50, display:'flex', flexDirection:'column', justifyContent:'center',
                      borderRight:`1px solid ${C.border}`, paddingRight:12, flexShrink:0,
                    }}>
                      <div style={{fontFamily:'var(--font-display)', fontSize:18, fontWeight:500, color:C.ink, lineHeight:1, letterSpacing:'-0.02em'}}>{id.toUpperCase()}</div>
                      <div style={{fontSize:10.5, color:C.ink3, marginTop:3, letterSpacing:'.05em'}}>{name.slice(0,3).toUpperCase()}</div>
                    </div>
                    <div style={{flex:1, display:'flex', alignItems:'center', minWidth:0}}>
                      {dish ? (
                        <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, minWidth:0}}>
                          <div onClick={() => setActiveDish(dish)} style={{cursor:'pointer', minWidth:0, flex:1}}>
                            <div style={{fontFamily:'var(--font-display)', fontSize:16, fontWeight:500, color:C.ink, letterSpacing:'-0.01em', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                              {dish.name}
                            </div>
                            <div style={{display:'flex', alignItems:'center', gap:8, fontSize:11.5, color:C.ink3}}>
                              <Clock size={11} />
                              <span>{dish.min} min</span>
                              <span>·</span>
                              <span>{portions} Port.</span>
                            </div>
                          </div>
                          <button onClick={() => removeDayDish(id)} style={{
                            width:28, height:28, borderRadius:'50%', border:'none',
                            background:'transparent', color:C.ink3, cursor:'pointer',
                            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                            transition:'background .15s',
                          }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = C.surface2; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          ><X size={14} /></button>
                        </div>
                      ) : (
                        <div style={{
                          color: isOver ? C.accent : C.ink3, fontSize:13.5,
                          fontStyle:'italic', fontFamily:'var(--font-display)',
                        }}>
                          {isOver ? 'Hier ablegen ↓' : 'Leer — zieh ein Gericht her'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DISH LIBRARY - HORIZONTAL SCROLL */}
            <div>
              <div style={{display:'flex', alignItems:'baseline', gap:10, marginBottom:12}}>
                <h2 style={{fontFamily:'var(--font-display)', fontSize:18, fontWeight:500, color:C.ink, margin:0, letterSpacing:'-0.02em'}}>Gerichte</h2>
                <span style={{fontSize:12, color:C.ink3, fontStyle:'italic'}}>zum Reinziehen</span>
              </div>
              <div className="kp-scroll" style={{
                display:'flex', gap:10, overflowX:'auto', padding:'4px 0 14px',
                scrollSnapType:'x mandatory', WebkitOverflowScrolling:'touch',
              }}>
                {allDishes.map(d => (
                  <div key={d.id} style={{scrollSnapAlign:'start'}}>
                    <DishChip dish={d} draggable compact />
                  </div>
                ))}
              </div>
              <p style={{fontSize:11.5, color:C.ink3, marginTop:6, fontStyle:'italic'}}>
                Tipp: Auf dem Handy auf die Bibliothek wechseln und Gerichte dort hinzufügen ist oft einfacher.
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════ LIBRARY TAB ═══════════════ */}
        {tab === 'library' && !activeDish && (
          <div className="fade-in">
            <div style={{marginBottom:24}}>
              <h2 style={{fontFamily:'var(--font-display)', fontSize:22, fontWeight:500, color:C.ink, margin:'0 0 2px', letterSpacing:'-0.02em'}}>Rezeptbibliothek</h2>
              <p style={{fontSize:13, color:C.ink3, margin:0}}>Tippe ein Gericht für das Rezept</p>
            </div>

            {/* ASK FOR NEW DISH */}
            <div style={{
              background:C.surface, border:`1px solid ${C.border}`, borderRadius:14,
              padding:'14px 16px', marginBottom:24, position:'relative', overflow:'hidden',
            }}>
              <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
                <Sparkles size={14} style={{color:C.accent}} />
                <span style={{fontFamily:'var(--font-display)', fontSize:14, fontWeight:500, color:C.ink}}>Neues Gericht vorschlagen lassen</span>
              </div>
              <div style={{display:'flex', gap:8}}>
                <input
                  type="text" value={askInput} onChange={e => setAskInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !loading.ask) askNewDish(); }}
                  placeholder="z.B. „etwas mit Hähnchen, asiatisch angehaucht"
                  className="kp-input" style={{flex:1, fontSize:13}}
                  disabled={loading.ask}
                />
                <Btn onClick={askNewDish} disabled={!askInput.trim() || loading.ask} primary>
                  {loading.ask ? <Loader2 size={13} style={{animation:'spin 1s linear infinite'}} /> : <Sparkles size={13} />}
                  Vorschlag
                </Btn>
              </div>
            </div>

            {/* DISH CATEGORIES */}
            {['schnell','mittel','wochenende'].map(cat => {
              const list = allDishes.filter(d => d.cat === cat);
              if (!list.length) return null;
              return (
                <div key={cat} style={{marginBottom:24}}>
                  <div style={{display:'flex', alignItems:'baseline', gap:10, marginBottom:12, paddingBottom:8, borderBottom:`1px solid ${C.border}`}}>
                    <h3 style={{fontFamily:'var(--font-display)', fontSize:17, fontWeight:500, color:C.ink, margin:0, letterSpacing:'-0.01em'}}>{CATS[cat].l}</h3>
                    <span style={{fontSize:11.5, color:C.ink3, fontFamily:'var(--font-body)'}}>{CATS[cat].t}</span>
                  </div>
                  <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:10}}>
                    {list.map(d => (
                      <div key={d.id} style={{position:'relative'}}>
                        <DishChip dish={d} onClick={() => setActiveDish(d)} />
                        {d.custom && (
                          <button onClick={(e) => { e.stopPropagation(); deleteCustom(d.id); }} style={{
                            position:'absolute', top:8, right:8, width:22, height:22, borderRadius:'50%',
                            border:'none', background: C.surface2, color: C.ink3,
                            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                          }} title="Eigenes Gericht löschen"><Trash2 size={11} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══════════════ RECIPE DETAIL ═══════════════ */}
        {activeDish && (
          <div className="fade-in">
            <button onClick={() => setActiveDish(null)} style={{
              display:'flex', alignItems:'center', gap:6, background:'transparent',
              border:'none', cursor:'pointer', color:C.ink3, fontSize:13,
              marginBottom:16, padding:0, fontFamily:'var(--font-body)',
            }}>
              <ArrowLeft size={14} /> Zurück
            </button>
            <div style={{background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:'24px 26px', marginBottom:14}}>
              <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:14, marginBottom:18, flexWrap:'wrap'}}>
                <div style={{flex:1, minWidth:180}}>
                  <h2 style={{
                    fontFamily:'var(--font-display)', fontSize:26, fontWeight:500, color:C.ink,
                    margin:'0 0 8px', letterSpacing:'-0.02em', lineHeight:1.15,
                  }}>
                    {activeDish.name}
                  </h2>
                  {activeDish.blurb && (
                    <p style={{fontSize:13.5, color:C.ink2, margin:'0 0 10px', fontStyle:'italic', lineHeight:1.5, fontFamily:'var(--font-display)'}}>
                      {activeDish.blurb}
                    </p>
                  )}
                  <div style={{display:'flex', alignItems:'center', gap:14, fontSize:12, color:C.ink3, marginBottom:10}}>
                    <span style={{display:'flex', alignItems:'center', gap:5}}><Clock size={12} /> {activeDish.min} min</span>
                    <span>·</span>
                    <span>{portions} Portion{portions>1?'en':''}</span>
                  </div>
                  <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
                    {activeDish.tags?.map(t => <Tag key={t} id={t} mode={dark?'dark':'light'} />)}
                  </div>
                </div>
                <Btn onClick={() => {
                  const emptyDay = DAYS.find(([id]) => !weekPlan[id])?.[0];
                  if (emptyDay) {
                    setWeekPlan(p => ({...p, [emptyDay]: activeDish.id}));
                    setActiveDish(null);
                    setTab('plan');
                  }
                }} primary small>
                  <Plus size={13} /> Zur Woche
                </Btn>
              </div>
              <div style={{borderTop:`1px solid ${C.border}`, paddingTop:18, minHeight:200}}>
                {loading.recipe || !recipes[`${activeDish.id}-${portions}`] ? (
                  <div style={{textAlign:'center', padding:'40px 20px', color:C.ink3}}>
                    <Loader2 size={20} style={{animation:'spin 1s linear infinite', color:C.accent}} />
                    <p style={{margin:'12px 0 0', fontSize:13, fontStyle:'italic', fontFamily:'var(--font-display)'}}>Rezept wird zubereitet…</p>
                  </div>
                ) : (
                  <MD text={recipes[`${activeDish.id}-${portions}`]} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ SHOP TAB ═══════════════ */}
        {tab === 'shop' && (
          <div className="fade-in">
            <div style={{marginBottom:20}}>
              <h2 style={{fontFamily:'var(--font-display)', fontSize:22, fontWeight:500, color:C.ink, margin:'0 0 2px', letterSpacing:'-0.02em'}}>Einkaufsliste</h2>
              <p style={{fontSize:13, color:C.ink3, margin:0}}>Aus deinem Wochenplan generiert</p>
            </div>

            {/* Selected dishes in week */}
            <div style={{background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', marginBottom:14}}>
              <div style={{fontSize:11.5, color:C.ink3, fontWeight:500, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10}}>Diese Woche</div>
              {weekDishCount === 0 ? (
                <p style={{margin:0, fontSize:13.5, color:C.ink3, fontStyle:'italic', fontFamily:'var(--font-display)'}}>
                  Noch keine Gerichte im Wochenplan. Wechsle auf Wochenplan und zieh ein paar Gerichte rein.
                </p>
              ) : (
                <div style={{display:'flex', flexDirection:'column', gap:6}}>
                  {DAYS.map(([id, name]) => {
                    const dishId = weekPlan[id];
                    const dish = dishId ? allDishes.find(d => d.id === dishId) : null;
                    if (!dish) return null;
                    return (
                      <div key={id} style={{display:'flex', alignItems:'center', gap:10, fontSize:13.5}}>
                        <span style={{fontSize:11, color:C.ink3, width:28, fontWeight:500, letterSpacing:'.05em'}}>{id.toUpperCase()}</span>
                        <span style={{color:C.ink, fontFamily:'var(--font-display)', fontWeight:500}}>{dish.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Btn onClick={generateShopping} disabled={!weekDishCount || loading.shop} primary
              style={{width:'100%', justifyContent:'center', padding:'12px 20px', fontSize:14}}>
              {loading.shop ? (<><Loader2 size={14} style={{animation:'spin 1s linear infinite'}} /> Liste wird erstellt…</>) :
                shoppingList ? (<><RefreshCw size={14} /> Liste neu erstellen</>) :
                (<><Sparkles size={14} /> Einkaufsliste generieren</>)}
            </Btn>

            {shoppingList && !loading.shop && (
              <div className="fade-in" style={{background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:'22px 24px', marginTop:16}}>
                <MD text={shoppingList} />
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ CHAT TAB ═══════════════ */}
        {tab === 'chat' && (
          <div className="fade-in">
            <div style={{marginBottom:16}}>
              <h2 style={{fontFamily:'var(--font-display)', fontSize:22, fontWeight:500, color:C.ink, margin:'0 0 2px', letterSpacing:'-0.02em'}}>Koch-Chat</h2>
              <p style={{fontSize:13, color:C.ink3, margin:0}}>Frag mich alles rund ums Kochen</p>
            </div>

            <div style={{display:'flex', flexDirection:'column', gap:10, minHeight:280, marginBottom:14}}>
              {chatMsgs.length === 0 && (
                <div style={{textAlign:'center', padding:'40px 20px', color:C.ink3}}>
                  <MessageCircle size={28} style={{opacity:.4, marginBottom:10}} />
                  <p style={{margin:0, fontSize:13.5, fontStyle:'italic', lineHeight:1.6, fontFamily:'var(--font-display)'}}>
                    Wie pochiere ich ein Ei?<br/>
                    Was passt zu Schweinemedaillons?<br/>
                    Warum klumpt meine Sauce?
                  </p>
                </div>
              )}
              {chatMsgs.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: m.role === 'user' ? C.accentSoft : C.surface,
                  color: m.role === 'user' ? C.accentInk : C.ink,
                  border: m.role === 'user' ? 'none' : `1px solid ${C.border}`,
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                  padding:'12px 16px', fontSize:14, lineHeight:1.55,
                }}>
                  {m.role === 'user'
                    ? <span>{m.content}</span>
                    : <MD text={m.content} />
                  }
                </div>
              ))}
              {loading.chat && (
                <div style={{
                  alignSelf:'flex-start', background:C.surface, border:`1px solid ${C.border}`,
                  borderRadius:'4px 14px 14px 14px', padding:'12px 16px',
                  fontSize:13, color:C.ink3, fontStyle:'italic', fontFamily:'var(--font-display)',
                }}>schreibt…</div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{display:'flex', gap:8, alignItems:'flex-end'}}>
              <textarea
                value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                placeholder="Frag mich etwas…"
                rows={2}
                className="kp-input" style={{flex:1, resize:'none'}}
                disabled={loading.chat}
              />
              <Btn onClick={sendChat} disabled={!chatInput.trim() || loading.chat} primary
                style={{padding:'11px 16px'}}>
                <Send size={14} />
              </Btn>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
