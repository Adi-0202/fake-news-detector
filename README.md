# Neural Sieve Cascade (NSC) — Core Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python: 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/downloads/)
[![Framework: FastAPI](https://img.shields.io/badge/Framework-FastAPI-emerald.svg)](https://fastapi.tiangolo.com/)
[![Frontend: React + Vite](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb.svg)](https://vitejs.dev/)

Neural Sieve Cascade (NSC) is a decoupled, multi-channel misinformation detection and factual verification pipeline. The system cross-examines unstructured text, web URLs, digital documents, and visual media forwards against real-time search engine indices. By combining advanced coreference resolution via state-of-the-art LLMs, real-time algorithmic domain scoring, and structural heuristics, NSC isolates facts from hyper-partisan rhetoric and automated rumor tracking loops.

---

## 🎯 The Problem & Our Approach

Modern misinformation operations exploit structural gaps in standard NLP models by utilizing non-standard formatting, complex cross-sentence references (pronouns hiding target entities), and short-lived web networks. Standard binary classifiers cannot keep up with changing global news cycles.

**NSC solves this using a two-pronged hybrid architecture:**
1. **Real-time Open Web RAG Pipeline (Active Phase 1):** Extracts factual assertions, cleans and normalizes source environments, checks domain integrity metrics to defeat typosquatting, and cross-references assertions against live public records.
2. **Local Machine Learning Cascade (Upcoming Phase 3):** An asynchronous, localized sorting cascade utilizing a multi-stage classification network designed to flag malicious syntax patterns directly on the edge.

---

## 🛠️ Tech Stack & Ecosystem

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | React.js (v18), Vite, Tailwind CSS | High-performance, reactive dual-panel dashboard interface. |
| **Core API Engine**| FastAPI, Uvicorn (ASGI) | Asynchronous networking, high-concurrency request routing. |
| **Orchestration Layer**| Python 3.12, Asyncio | Orchestrates parallel task pipelines and multi-threaded processing. |
| **Extraction Tiers**| EasyOCR, PyTorch, PyPDF, Pillow | Multi-channel extraction (Computer Vision OCR + Vector Document parsing). |
| **Reasoning Tier** | Groq Client SDK (`llama-3.3-70b-versatile`) | Coreference resolution mapping and ultimate factual adjudication. |
| **Storage Layer** | SQLite 3, WAL Mode | Lightweight transactional logging and structural audit metrics. |

---

## 🏗️ System Architecture & Advanced Subsystems

```text
       [ User Content Intake ] ── (Web Link, Text Block, PDF, Image File)
                  │
                  ▼
   ┌──────────────────────────────┐
   │    Cross-Channel Services    │ ── Clean, isolate text, and strip artifacts
   └──────────────┬───────────────┘
                  │
                  ▼
   ┌──────────────────────────────┐
   │  Groq Coreference Resolver   │ ── Resolves ambiguous pronouns into explicit nouns
   └──────────────┬───────────────┘
                  │
                  ▼
   ┌──────────────────────────────┐
   │ Dynamic Search Evidence RAG  │ ── Generates concurrent live-web search threads
   └──────────────┬───────────────┘
                  │
                  ▼
   ┌──────────────────────────────┐
   │ Multi-Tier Trust Matrix (SS) │ ── Audits domain authority, flags typosquatting,
   └──────────────┬───────────────┘    and runs Jaccard-based snippet consensus
                  │
                  ▼
   ┌──────────────────────────────┐
   │     LLM Factual Adjudicator  │ ── Compares resolved statements vs weighted evidence
   └──────────────┬───────────────┘
                  │
                  ├──────────────────────────────┐
                  ▼                              ▼
     [ API Response Contract ]        [ Persistent SQLite Sync ]
```

### Advanced Algorithmic Subsystems

**Coreference Resolution:** Converts vague statements (e.g., "The company delayed it because the minister was accused") into self-contained atomic assertions (e.g., "Tech Corp delayed its project release because Minister John Doe was accused of insider trading").

**Multi-Tiered Domain Scorer (`source_scorer.py`):**

- **Layer 1:** Direct whitelist match and absolute cryptographic validation for `.gov`, `.gov.in`, and `.edu` top-level domains.
- **Layer 2 (Adversarial Security Shielding):** Uses Gestalt pattern matching algorithms via `SequenceMatcher` to flag and drop adversarial typosquatting domains (e.g., `rn-reuters.com`) or combosquatting networks.
- **Layer 3 (Global Popularity Index):** Integrates OpenPageRank backlink indexing metrics.
- **Layer 4 (Dynamic Consensus Loop):** Programmatically audits snippet token overlap (Jaccard Similarity Index) across distinct domains to dynamically boost independent local news validation metrics.

---

## 📂 Project Repository Structure

```plaintext
├── backend/                  # FastAPI Application Environment
│   ├── app/
│   │   ├── db.py             # Database initializes and handles connections
│   │   ├── main.py           # Thin core application bootstrap entrypoint
│   │   ├── routes/
│   │   │   ├── analyze.py    # Primary intake routing coordinator
│   │   │   └── results.py    # Scan logs historical telemetry exporter
│   │   ├── schemas/
│   │   │   └── api_schemas.py# Pydantic schema contracts & data validation models
│   │   └── services/
│   │       ├── claim_extractor.py # AI text breakdown and headline generation
│   │       ├── image_processor.py # Lazy-loaded EasyOCR Vision processing
│   │       ├── pdf_processor.py   # Multi-page binary layout extractor
│   │       ├── rag_verifier.py    # Concurrently checks live open-web RAG engines
│   │       ├── scraper.py         # Standard HTML web scraping utility
│   │       ├── text_processor.py  # Defensive whitespace/payload sanitation
│   │       └── source_scorer.py   # Multi-tiered domain trust scoring array
│   └── requirements.txt       # Unified Python server dependencies manifest
└── frontend/                 # React UI Workspace Application Environment
    ├── src/
    │   ├── config.js         # Centralized, environment-aware API URL manager
    │   ├── App.jsx           # Master state manager and root UI shell container
    │   ├── components/       # Reusable, atomic design interface presentation elements
    │   │   ├── ClaimCard.jsx
    │   │   ├── OverallScore.jsx
    │   │   ├── SourceBadge.jsx
    │   │   └── UrlInputForm.jsx
    │   └── pages/            # View managers handling operational layouts
    │       ├── Home.jsx
    │       └── Results.jsx
    ├── .env.development      # Targets localhost parameters during debugging
    └── .env.production       # Points compilation streams to live cloud targets
```

---

## 🚀 Local Installation & Environment Setup

### Prerequisites

- Python 3.12 or higher installed locally.
- Node.js (v18.x or higher) and npm installed locally.
- A valid Groq API Key (Claim your key at the Groq Console).

### 1. Backend Service Configuration

Navigate into the backend directory, spin up your python isolation environment, and trigger dependency mapping:

```bash
cd backend

# Initialize your virtual environment isolation layer
python3 -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install all backend dependencies
pip install -r requirements.txt
```

Create a `.env` configuration file inside your `backend/` root directory:

```
GROQ_API_KEY=your_groq_api_token_here
OPEN_PAGERANK_API_KEY=optional_pagerank_token_here
```

Launch the hot-reloading development server:

```bash
uvicorn app.main:app --reload --port 8000
```

The active Swagger API documentation interface can be inspected live at `http://127.0.0.1:8000/docs`.

### 2. Frontend Workspace Configuration

Open a secondary independent terminal shell configuration and initialize the node engine dependencies:

```bash
cd frontend
npm install
```

Verify that your `.env.development` variables point to your local backend port:

```
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start the local Vite preview server:

```bash
npm run dev
```

Open your browser and navigate to the reported local server address (typically `http://localhost:5173`).

---

## 🛠️ Current Production Deployment Blueprint

The production stack is currently deployed across a secure, split multi-cloud configuration to minimize costs while providing zero-downtime scalability:

- **Backend API Engine:** Hosted on Render's Web Services connected directly to Python runtime configurations.
  - **Memory Optimization Notice:** Due to Render's free memory limit (512MB RAM), the EasyOCR computer vision pipeline uses a Lazy-Loading Pattern. It remains completely unloaded at system boot and only opens if an image validation is requested.
- **Frontend Web Application:** Hosted on Vercel's Hobby Infrastructure, featuring automated edge compilation triggered on every git push command.

---

## 🗺️ Engineering Development Roadmap

We are looking for core contributors to help expand the engine across the upcoming feature sprints:

### 🔓 Phase 2: Multi-Tenancy & Decentralized User Key Architecture

- Add database entities (`users`, `user_settings`) via core schema tables or SQLAlchemy migrations.
- Transition from a single global environment token to a secure Runtime Client Initialization Model using OAuth2 and JWT bearer security guards.
- Implement user profile settings views allowing individual developers to store and cycle through their custom Groq API tokens.

### 🧠 Phase 3: The Custom Neural Sieve Cascade (NSC) Local ML Tier

Integrate a local, high-speed machine learning model stack trained over a corpus of 651,191 malicious text records. The incoming text will pass through a local three-stage pipeline before escalating to the live web search tier:

- **Stage 1 (Logistic Regression):** Ultra-fast syntactic checking to score statistical text layout vectors.
- **Stage 2 (CNN/LSTM Network Architecture):** Evaluates sequential semantic flows to flag deep textual manipulation anomalies.
- **Stage 3 (TinyBERT Transformer Layer):** Runs high-fidelity local entity classification checks.

---

## 🤝 Contributing & Issue Isolation

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

1. Fork the Project Repository.
2. Create your Feature Branch (`git checkout -b feature/AmazingUpgrade`).
3. Commit your modifications cleanly (`git commit -m 'Add some descriptive performance feature'`).
4. Push to the remote branch (`git push origin feature/AmazingUpgrade`).
5. Open a formal Pull Request detailing changes, performance metrics variations, and interface mutations.

### Bug & Feature Tracking

If you encounter missing domain paths, edge-case HTML scraping limits, or unexpected payload parsing faults, please file an official log item inside the GitHub Issues tab. Provide your stack trace information, input sample strings, and clear replication logs.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.