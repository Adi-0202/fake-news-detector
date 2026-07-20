import os
import json
import asyncio
from groq import Groq
from ddgs import DDGS
from app.services.source_scorer import evaluate_evidence_consensus
from app.services.claim_extractor import handle_llm_api_failure

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)


def fetch_search_evidence(query: str) -> list:
    try:
        print(f"fetching evidence for search query: '{query}'")
        results = DDGS().text(query, max_results=3)
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
        print(f"Search failed for '{query}': {e}")
        return []


async def verify_claim_with_ai(claim: str, evidence: list) -> dict:
    if not evidence:
        return {
            "verdict": "UNVERIFIED",
            "explanation": "There is no evidence found across active search indexing to cross-examine this claim."
        }
    just_snippets = [item["snippet"] for item in evidence]

    # Strict contradiction adjudication prompt
    prompt = f"""
    You are a strict, unyielding Natural Language Inference (NLI) fact-checking judge.
    Your sole task is to determine whether the 'Web Evidence' SUPPORTS, REFUTES, or is INSUFFICIENT to verify the 'Claim'.

    TARGET CLAIM TO CHECK:
    "{claim}"

    RETRIEVED WEB EVIDENCE:
    {json.dumps(just_snippets, indent=2)}

    STRICT ADJUDICATION RULES:
    1. DIRECT CONTRADICTION RULE (MUST BE REFUTED):
       - If the Claim asserts entity/fact X (e.g., "Cristiano Ronaldo is the Prime Minister of India"), but the Evidence establishes entity/fact Y (e.g., "Narendra Modi is the Prime Minister of India"), the verdict MUST BE "REFUTED".
       - NEVER mark a claim as "SUPPORTED" or "TRUSTWORTHY" just because the evidence contains true facts about the general topic. The evidence MUST directly confirm the exact claim being checked.
    2. STRICT SUPPORTED RULE:
       - Mark "SUPPORTED" ONLY if the evidence explicitly confirms the exact entity, action, and assertion described in the claim.
    3. UNVERIFIED RULE:
       - Mark "UNVERIFIED" if the evidence does not contain enough information to prove or disprove the claim.

    You must respond ONLY with a JSON object matching this exact schema:
    {{
        "verdict": "SUPPORTED" | "REFUTED" | "UNVERIFIED",
        "explanation": "A concise 1-2 sentence explanation pointing out the exact contradiction or confirmation based on the web evidence."
    }}
    """
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.0, # Zero temperature for strict deterministic logic
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        print(f"Groq Verification Error: {e}")
        handle_llm_api_failure(e)


async def parallel_verification_worker(claim: str, search_query: str = None) -> dict:
    # Use search_query if available, otherwise fall back to claim
    target_query = search_query if search_query else claim
    
    # 1. Fetch live open-web search snippets using target_query
    raw_evidence = await asyncio.to_thread(fetch_search_evidence, target_query)
    
    # 2. Run raw items through the consensus matrix engine
    verified_evidence = evaluate_evidence_consensus(raw_evidence)
    
    # 3. Adjudicate the ACTUAL claim text against the evidence found
    verification = await verify_claim_with_ai(claim, verified_evidence)
    
    sources = [
        {
            "title": f"[{item.get('credibility_score', 80)}] {item['title']}",
            "url": item["url"]
        } 
        for item in verified_evidence
    ]
    
    return {
        "claim": claim,
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