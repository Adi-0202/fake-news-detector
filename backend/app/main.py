import trafilatura
import requests
from fastapi import FastAPI
from app.schemas.api_schemas import AnalyzeRequest
from fastapi.middleware.cors import CORSMiddleware

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins for development
    allow_methods=["*"],
    allow_headers=["*"],
)

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
            verdict = "SUPPORTED"
            explanation = "Text extracted successfully."
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
            "claim_text": "Scraping Status",
            "verdict": verdict,
            "explanation": explanation
        }
    ]