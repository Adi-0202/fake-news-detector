import os
import json
import sqlite3
import asyncio
import requests
import trafilatura
from datetime import datetime
from pypdf import PdfReader
from fastapi import FastAPI, UploadFile, File
from io import BytesIO
from fastapi.middleware.cors import CORSMiddleware
from app.schemas.api_schemas import AnalyzeRequest
from dotenv import load_dotenv
from groq import Groq
from ddgs import DDGS

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)
DB_PATH = "fact_checker.db"

def init_db():
    """Initializes schema and applies context-aware history title column migrations."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT,
            overall_verdict TEXT,
            overall_explanation TEXT,
            claims TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Migration Guard: Gracefully append title column if user has an existing DB file
    try:
        cursor.execute("ALTER TABLE scans ADD COLUMN title TEXT")
        conn.commit()
    except sqlite3.OperationalError:
        pass # Column already exists
    finally:
        conn.close()

init_db()


async def generate_summary_title(claims: list):
    """Generates a concise, high-level 3-5 word headline for sidebar logs."""
    if not claims:
        return "Untitled Scan"
    prompt = f"""
    Analyze these fact-checking claims and generate a punchy, highly descriptive 3 to 5 word summary title for an application history tab.
    Focus only on the main subject and event (e.g., "NEET-UG 2026 Paper Leak" or "RBI Digital Currency Update").
    Respond ONLY with the raw title string. Do not include quotes, markdown accents, or concluding periods.

    Claims: {json.dumps(claims)}
    """
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Title Generation Error: {e}")
        return "Awaiting Breakdown"


async def extract_claims_with_ai(text: str):
    """Isolates checkable claims and enforces standalone grammatical contexts."""
    prompt = f"""
    You are an expert fact-checking extractor. Extract exactly 3 distinct, checkable factual claims from the news text provided below.
    
    COREFERENCE RESOLUTION CONSTRAINTS:
    1. Each claim statement must be completely SELF-CONTAINED, STANDALONE, and ATOMIC.
    2. Explicitly resolve all contextual pronouns and general nouns. Never use terms like "the paper", "the suspect", "the company", "the student", "the minister", or "the event".
    3. You must replace general nouns with their absolute Proper Nouns, Specific Titles, or Full Entity Identifiers present in the source text.
       - Structural Example:
         * Incomplete: "[Subject] was detained for selling the leaked question paper."
         * Complete: "[Full Name of Subject] was detained for allegedly selling the leaked [Specific Exam Name] question paper."
    4. A human reading a single claim completely out of context must understand exactly who, what, where, and when the claim refers to from that single sentence alone.

    You must respond ONLY with a JSON object matching this exact schema:
    {{
        "claims": [
            "First fully self-contained factual claim",
            "Second fully self-contained factual claim",
            "Third fully self-contained factual claim"
        ]
    }}
    
    News Text: {text[:3000]}
    """
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        print(f"Groq Extraction Error: {e}")
        return {"claims": []}


def fetch_search_evidence(claim: str):
    """Searches the live web to find supporting or contradicting sources."""
    try:
        print(f"Searching web for: '{claim}'")
        results = DDGS().text(claim, max_results=3)
        evidence_list = []
        for r in results:
            if "body" in r and "href" in r:
                evidence_list.append({
                    "snippet": r["body"],
                    "url": r["href"],
                    "title": r.get("title", "Source Link")
                })
        return evidence_list
    except Exception as e:
        print(f"Search failed for '{claim}': {e}")
        return []


async def verify_claim_with_ai(claim: str, evidence: list):
    """Compares the claim against text snippets to judge its accuracy."""
    if not evidence:
        return {"verdict": "UNVERIFIED", "explanation": "No online evidence found to verify this claim."}

    just_snippets = [item["snippet"] for item in evidence]

    prompt = f"""
    You are a high-level fact-checking judge. Compare the given 'Claim' against the provided 'Web Evidence' snippets.
    Determine if the evidence supports, refutes, or is insufficient to verify the claim.
    
    Claim: {claim}
    Web Evidence: {json.dumps(just_snippets)}
    
    You must respond ONLY with a JSON object matching this exact schema:
    {{
        "verdict": "SUPPORTED" or "REFUTED" or "UNVERIFIED",
        "explanation": "A concise 1-2 sentence explanation proving or debunking the claim using the search evidence."
    }}
    """
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        print(f"Groq Verification Error: {e}")
        return {"verdict": "UNVERIFIED", "explanation": "Error running verification check."}


async def parallel_verification_worker(claim: str):
    """Manages searching, verifying, and packaging source links for a claim."""
    evidence = await asyncio.to_thread(fetch_search_evidence, claim)
    verification = await verify_claim_with_ai(claim, evidence)
    sources = [{"title": item["title"], "url": item["url"]} for item in evidence]
    
    return {
        "claim_text": claim,
        "verdict": verification.get("verdict", "UNVERIFIED"),
        "explanation": verification.get("explanation", "Verification complete."),
        "sources": sources
    }


def calculate_overall_status(claims: list):
    """Aggregates individual verdicts into an overall article authenticity profile."""
    verdicts = [c["verdict"] for c in claims]
    if "REFUTED" in verdicts:
        return "HIGH RISK", "Critical factual assertions in this article directly contradict verified public reporting."
    if "UNVERIFIED" in verdicts and "SUPPORTED" in verdicts:
        return "MIXED VALIDITY", "Some key facts match mainstream documentation, but peripheral elements lack clear indexing."
    if all(v == "SUPPORTED" for v in verdicts):
        return "TRUSTWORTHY", "All extracted core assertions are fully validated by live web reporting references."
    return "UNVERIFIED", "The content references developments that cannot currently be tracked across search networks."


async def core_processing_pipeline(article_text: str, source_identifier: str):
    """Processes clean strings through the extraction, search, and validation loop."""
    print("Extracting checkable assertions...")
    claims_data = await extract_claims_with_ai(article_text)
    claims_list = claims_data.get("claims", [])
    
    print("Launching parallel verification engine...")
    tasks = [parallel_verification_worker(claim) for claim in claims_list]
    claims_results, summary_title = await asyncio.gather(
        asyncio.gather(*tasks),
        generate_summary_title(claims_list)
    )
    
    overall_verdict, overall_explanation = calculate_overall_status(claims_results)
    
    final_payload = {
        "title": summary_title,
        "overall_verdict": overall_verdict,
        "overall_explanation": overall_explanation,
        "claims": claims_results
    }
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        local_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            "INSERT INTO scans (url, overall_verdict, overall_explanation, claims, title, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
            (source_identifier, overall_verdict, overall_explanation, json.dumps(claims_results), summary_title, local_time)
        )
        conn.commit()
        conn.close()
        print(f"Saved payload to database under origin token: {source_identifier}")
    except Exception as db_err:
        print(f"Database Save Exception: {db_err}")

    return final_payload


@app.post("/analyze")
async def analyze_article(request: AnalyzeRequest):
    print(f"--- New Analysis Request (URL/Text) ---")
    
    if request.text and request.text.strip():
        return await core_processing_pipeline(request.text.strip(), "Raw Text Entry")
        
    elif request.url and request.url.strip():
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
        try:
            response = requests.get(request.url, headers=headers, timeout=10)
            response.raise_for_status()
            article_text = trafilatura.extract(response.text)
            if not article_text:
                return {"overall_verdict": "ERROR", "overall_explanation": "Could not parse main content from link.", "claims": []}
            return await core_processing_pipeline(article_text, request.url.strip())
        except Exception as scrap_err:
            return {"overall_verdict": "ERROR", "overall_explanation": f"Failed to acquire webpage context: {str(scrap_err)}", "claims": []}
            
    return {"overall_verdict": "ERROR", "overall_explanation": "No valid URL payload or raw text document discovered.", "claims": []}


@app.post("/analyze/pdf")
async def analyze_pdf(file: UploadFile = File(...)):
    """Ingests a binary PDF file stream, reads text data, and kicks off verification."""
    print(f"--- New Analysis Request (PDF Document) ---")
    print(f"Processing Uploaded File: {file.filename}")
    
    try:
        # Read file contents into buffer memory
        contents = await file.read()
        pdf_stream = BytesIO(contents)
        reader = PdfReader(pdf_stream)
        
        # Loop through pages and concatenate raw text contents
        extracted_text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                extracted_text += page_text + "\n"
                
        if not extracted_text.strip():
            return {"overall_verdict": "ERROR", "overall_explanation": "PDF file appears empty or consists purely of unreadable scanned images.", "claims": []}
            
        source_label = f"PDF: {file.filename}"
        return await core_processing_pipeline(extracted_text.strip(), source_label)
        
    except Exception as pdf_err:
        print(f"PDF Parsing Exception: {pdf_err}")
        return {"overall_verdict": "ERROR", "overall_explanation": f"Failed to digest PDF document structures: {str(pdf_err)}", "claims": []}


@app.get("/history")
async def get_history_log():
    """Retrieves the top 10 most recent automated fact-checking scans with summaries."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, url, overall_verdict, overall_explanation, claims, timestamp, title FROM scans ORDER BY timestamp DESC LIMIT 10")
        rows = cursor.fetchall()
        conn.close()
        
        history_list = []
        for r in rows:
            history_list.append({
                "id": r[0],
                "url": r[1],
                "overall_verdict": r[2],
                "overall_explanation": r[3],
                "claims": json.loads(r[4]),
                "timestamp": r[5],
                "title": r[6] if r[6] else r[1] # Fallback to URL if historical entry pre-dates migration
            })
        return history_list
    except Exception as e:
        print(f"Database Fetch Exception: {e}")
        return []

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)