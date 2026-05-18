# 🍳 Mein Kochplan – Setup-Anleitung

Deine eigene Koch-App mit Claude. Diese Anleitung bringt sie in ~15 Minuten online.

---

## Was du brauchst

1. Deinen Anthropic API-Key (beginnt mit `sk-ant-...`) – aus console.anthropic.com → API Keys
2. Einen kostenlosen GitHub-Account → https://github.com/signup
3. Einen kostenlosen Vercel-Account → https://vercel.com/signup (einfach mit GitHub anmelden)

> Warum Vercel? Es ist gratis für private Projekte, und es kann die kleine "Server-Funktion"
> ausführen die deinen API-Key geheim hält. Reine Datei-Hoster (wie GitHub Pages) können das nicht.

---

## Schritt 1 – Code zu GitHub bringen

**Variante A – ohne Kommandozeile (einfacher):**

1. Geh auf https://github.com/new
2. Repository-Name: `kochplan-app` → "Create repository"
3. Auf der nächsten Seite: "uploading an existing file"
4. Zieh ALLE Dateien aus diesem Ordner rein (außer `node_modules` und `dist` falls vorhanden)
5. "Commit changes"

**Variante B – mit Kommandozeile:**

```bash
cd kochplan-app
git init
git add .
git commit -m "Erste Version"
git branch -M main
git remote add origin https://github.com/DEIN-NAME/kochplan-app.git
git push -u origin main
```

---

## Schritt 2 – Bei Vercel deployen

1. Geh auf https://vercel.com/new
2. Wähle dein `kochplan-app` Repository → "Import"
3. **WICHTIG – bevor du auf Deploy klickst:**
   - Klapp "Environment Variables" auf
   - Name: `ANTHROPIC_API_KEY`
   - Value: dein Key (`sk-ant-...`)
   - "Add"
4. Jetzt "Deploy" klicken
5. ~1 Minute warten → du kriegst eine URL wie `kochplan-app-xyz.vercel.app`

Fertig. Das ist deine App, von überall erreichbar.

---

## Schritt 3 – Aufs Handy

Öffne die Vercel-URL im Handy-Browser:

- **iPhone (Safari):** Teilen-Button → "Zum Home-Bildschirm"
- **Android (Chrome):** Menü (⋮) → "Zum Startbildschirm hinzufügen"

Jetzt hast du ein App-Icon wie eine echte App.

---

## Sicherheit – das Wichtigste

✅ Dein API-Key steht NUR in den Vercel-Umgebungsvariablen, NIEMALS im Code
✅ Der Browser ruft nie Anthropic direkt – immer über die geschützte `/api/claude` Funktion
✅ Setz in der Anthropic Console ein Spend-Limit (z.B. 5 €/Monat) als zusätzliches Netz

⚠️ Lade deinen API-Key niemals zu GitHub hoch. Er gehört nur in die Vercel-Settings.
   Falls du ihn aus Versehen committest: in der Console sofort löschen und neuen erstellen.

---

## Kosten

- Vercel: kostenlos für deine Nutzung
- Anthropic API: nur pro Anfrage (~0,01 € je Rezept/Liste, ~0,005 € je Chat-Nachricht)
- Realistische Studentennutzung: wenige Euro pro Jahr

---

## Etwas ändern später?

- Gerichte hinzufügen/ändern: `src/App.jsx`, ganz oben die Liste `BASE_DISHES`
- Nach Änderung: Dateien zu GitHub pushen → Vercel deployt automatisch neu
- Oder frag mich einfach im Chat, ich pass den Code für dich an

---

## Probleme?

- **"API-Key nicht konfiguriert":** Environment Variable in Vercel fehlt/falsch geschrieben.
  Settings → Environment Variables prüfen, muss exakt `ANTHROPIC_API_KEY` heißen. Danach
  unter Deployments das letzte Deployment neu starten ("Redeploy").
- **Antworten kommen nicht:** Anthropic-Guthaben leer? In der Console nachsehen.
- **Alles weg nach Browser-Wechsel:** Daten liegen lokal im Browser (localStorage). Anderer
  Browser/Gerät = eigene Daten. Das ist normal bei dieser Variante.

Viel Spaß beim Kochen 👨‍🍳
