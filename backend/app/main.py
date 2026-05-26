import os
import json
import trafilatura
import requests
import asyncio
from fastapi import FastAPI
from app.schemas.api_schemas import AnalyzeRequest
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from groq import Groq
from ddgs import DDGS

load_dotenv()

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins for development
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)

async def extract_claims_with_ai(text: str):
    prompt = f"""
    You are a fact-checking bot. Extract exactly 3 specific, checkable factual claims from the text below.
    You must respond ONLY with a JSON object matching this exact schema:
    {{
        "claims": [
            "First factual claim statement",
            "Second factual claim statement",
            "Third factual claim statement"
        ]
    }}
    
    News Text: {text[:3000]}
    """
    try:
        completion=client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.1,  # Keeps the model strictly factual
        )
        raw_json_string = completion.choices[0].message.content
        return json.loads(raw_json_string)
    except Exception as e:
        print(f"Groq API error,{e}")
        return {"claims": []}
    
def fetch_search_evidence(claim: str):
    try:
        print(f"Searching web for: '{claim}'")
        results=DDGS().text(claim, max_results=3)
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

async def verify_claim_with_ai(claim: str, evidence:list):
    if not evidence:
        return {"verdict" : "UNVERIFIED", "explanation": "No online evidence found to explain this evidence"}
    
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
        completion=client.chat.completions.create(
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
    # DDGS is synchronous; running it in to_thread stops it from blocking other tasks
    evidence = await asyncio.to_thread(fetch_search_evidence, claim)
    
    # Run the async AI evaluation
    verification = await verify_claim_with_ai(claim, evidence)
    # Isolate metadata links to return back directly to our React component view
    sources = [{"title": item["title"], "url": item["url"]} for item in evidence]
    
    return {
        "claim_text": claim,
        "verdict": verification.get("verdict", "UNVERIFIED"),
        "explanation": verification.get("explanation", "Verification complete."),
        "sources": sources  # Added back into response payload
    }

@app.post("/analyze")
async def analyze_article(request: AnalyzeRequest):
    print(f"Analyzing URL: {request.url}")

    # Step 1: Pretend to be a real Chrome browser
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
    }

    try:
        # Step 2: Download the raw HTML manually
        response = requests.get(request.url, headers=headers, timeout=10)
        response.raise_for_status() # Check if the website blocked us (e.g., 403 error)
        
        # Step 3: Use trafilatura to extract clean text from that HTML
        article_text = trafilatura.extract(response.text)

        if not article_text:
            print("Trafilatura failed to extract text.")
            return [{"claim_text": "Failed to extract article content.", "verdict": "ERROR", "explanation": "Could not parse page."}]
            
        # 3. Pass the scraped text directly into the AI function
        print("Sending text to Groq for claim extraction...")
        claims_data = await extract_claims_with_ai(article_text)
        
        print(f"AI Raw JSON Response: {json.dumps(claims_data, indent=2)}")

        # Step 3: Concurrent Live Web RAG Engine
        print("Launching parallel verification engine...")
        claims_list = claims_data.get("claims", [])
        # Create a list of concurrent tasks for each extracted claim
        tasks = [parallel_verification_worker(claim) for claim in claims_list]
        # Fire all tasks simultaneously and wait for the combined results bundle
        formatted_response = await asyncio.gather(*tasks)
        return formatted_response

    except Exception as e:
        print(f"Pipeline failed: {e}")
        return [{"claim_text": "Pipeline processing error", "verdict": "ERROR", "explanation": str(e), "sources": []}]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)