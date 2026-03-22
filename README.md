# 📚 StudyNexus — Study Resource Organizer

> Organize your study links and local files in one place — powered by **Cerebras AI** for instant smart categorization.

---

## 🚀 How to Run (No Installation Needed)

```
1. Download or clone this repository
2. Open  index.html  in any modern browser
3. Done — the app runs instantly
```

> ✅ No npm, no server, no terminal commands. Just open the file.

---

## 🌟 Features

| Feature | Description |
|---|---|
| 🔗 **Web URLs** | Save any link with title, category & tags |
| 📁 **Local Files** | Upload PDFs, PPTs, images, videos — stored in browser |
| ✦ **AI Suggestions** | Cerebras AI auto-fills title, category & tags |
| ✏️ **Edit Anytime** | Change category, tags or title after saving |
| ⭐ **Star Resources** | Mark important ones for quick access |
| 🔍 **Search & Filter** | Filter by category, file type, tag, or keyword |
| ⊞ **Grid / List View** | Switch between card grid and compact list |

---

## 🔑 Getting Your Free Cerebras API Key

The AI feature needs a **free** Cerebras API key.

**Steps:**

1. Go to **[cloud.cerebras.ai](https://cloud.cerebras.ai)**
2. Click **Sign Up** — it's free, no credit card needed
3. After logging in, go to **API Keys** in the left sidebar
4. Click **Create New API Key**
5. Copy the key (starts with `csk-...`)

**Add it to the app:**

1. Open `index.html` in your browser
2. Look at the **bottom of the left sidebar**
3. Paste your key into the **"Paste Cerebras API key…"** field
4. The status shows **"✓ Key saved"** — you're ready

> 🔒 Your key is saved only in your browser's localStorage. It never leaves your device except when making AI requests directly to Cerebras.

---

## 📁 Project Structure

```
studynexus/
├── index.html          ← Open this file to run the app
├── css/
│   ├── style.css       ← Layout, cards, sidebar
│   ├── animations.css  ← All keyframe animations
│   └── modal.css       ← Popup form & AI panel
└── js/
    ├── data.js         ← Data storage & helpers
    ├── render.js       ← Builds the UI
    ├── actions.js      ← Star, delete, edit, filter
    ├── modal.js        ← Form & file upload logic
    ├── ai.js           ← Cerebras AI integration
    └── app.js          ← App entry point
```

---

## 🧠 Tech Stack

- **Pure HTML + CSS + Vanilla JavaScript** — zero frameworks, zero dependencies
- **localStorage** — all data saved in the browser (no backend needed)
- **FileReader API** — reads local files and stores them as base64
- **Cerebras AI** — llama-4-scout model for smart suggestions
- **Blob API** — lets you open stored files in the browser

---

## 💡 Tips for Judges

- Sample data is pre-loaded on first launch so the app looks populated immediately
- Try the **AI suggest button** in the Add Resource form — paste any URL and click ✦
- Try **uploading a PDF** using the "📁 Local File" tab — then click "↗ Open File"
- Click the **✏ edit button** on any card to change its category
- The **By Type** sidebar section filters resources by file format

---

*Built for the Web Dev Hackathon — StudyNexus helps students stop losing important links and files.*
