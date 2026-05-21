import os
import json
import trafilatura
import requests
from fastapi import FastAPI
from app.schemas.api_schemas import AnalyzeRequest
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from groq import Groq

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
        return {"claims": ["Failed to extract claims due to an AI error."]}

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
        
        if article_text:
            print(f"Success! Scraped: {article_text[:100]}...")
            
            # 3. Pass the scraped text directly into the AI function
            print("Sending text to Groq for claim extraction...")
            claims_data = await extract_claims_with_ai(article_text)
            
            print(f"AI Raw JSON Response: {json.dumps(claims_data, indent=2)}")

            formatted_response = []
            for claim in claims_data.get("claims", []):
                formatted_response.append({
                    "claim_text": claim,
                    "verdict": "UNVERIFIED", # Standard default before verification runs
                    "explanation": "Claim extracted from source text successfully."
                })
            
            return formatted_response
        else:
            print("Trafilatura couldn't find the article body in the HTML.")
            verdict = "UNVERIFIED"
            explanation = "Could not find article content."

    except Exception as e:
        print(f"Request failed: {e}")
        article_text = None
        verdict = "UNVERIFIED"
        explanation = f"Error: {str(e)}"

    return [
        {
            "claim_text": "AI Claim Extraction",
            "verdict": verdict,
            "explanation": explanation
        }
    ]