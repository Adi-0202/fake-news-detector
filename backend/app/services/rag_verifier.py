import os
import json
import asyncio
from groq import Groq
from ddgs import DDGS

client=Groq(api_key=os.getenv("GROQ_API_KEY"))

def fetch_search_evidence(claim: str) -> list:
    try:
        print(f"fetching evidence for '{claim}'")
        results=DDGS().text(claim, max_results=3)
        evidence_list=[]
        for r in results:
            if "body" in r and "href" in r:
                evidence_list.append({
                    "snippet":r["body"],
                    "url":r["href"],
                    "title":r.get("title","Source Link")
                })
        return evidence_list
    except Exception as e:
        print(f"Search failed for '{claim}': {e}")
        return []
    
async def verify_claim_with_ai(claim: str,evidence: list) -> dict:
    if not evidence:
        return {
            "verdict": "UNVERIFIED",
            "explanation":"There is no evidence found across active search indexing to cross-examine this claim."
        }
    just_snippets=[item["snippet"] for item in evidence]

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
            messages=[{"role":"user", "content":prompt}],
            response_format={"type":"json_object"},
            temperature=0.1,
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        print(f"Groq Verification Error: {e}")
        return {"verdict": "UNVERIFIED", "explanation": "Error running verification check."}
    
async def parallel_verification_worker(claim: str) -> dict:
    evidence = await asyncio.to_thread(fetch_search_evidence, claim)
    verification = await verify_claim_with_ai(claim, evidence)
    sources = [{"title": item["title"], "url": item["url"]} for item in evidence]
    return {
        "claim_text": claim,
        "verdict": verification.get("verdict", "UNVERIFIED"),
        "explanation": verification.get("explanation", "Verification complete."),
        "sources": sources
    }

def calculate_overall_status(claims: list) -> tuple:
    verdicts = [c["verdict"] for c in claims]
    if "REFUTED" in verdicts:
        return "HIGH RISK", "Critical factual assertions in this content directly contradict verified public reporting."
    if "UNVERIFIED" in verdicts and "SUPPORTED" in verdicts:
        return "MIXED VALIDITY", "Some key facts match mainstream documentation, but peripheral elements lack clear indexing."
    if all(v == "SUPPORTED" for v in verdicts):
        return "TRUSTWORTHY", "All extracted core assertions are fully validated by live web reporting references."
    return "UNVERIFIED", "The content references developments that cannot currently be tracked across search networks."