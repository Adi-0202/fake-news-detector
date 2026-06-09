import os
import json
from groq import Groq

GROQ_API_KEY=os.getenv("GROQ_API_KEY")
client=Groq(api_key=GROQ_API_KEY)

async def extract_claims_with_ai(text: str) -> list:
    if not text.strip():
        return []
    
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
        completion=client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role":"user", "content":prompt}],
            response_format={"type":"json_object"},
            temperature=0.1,
        )

        parsed_response=json.loads(completion.choices[0].message.content)
        return parsed_response.get("claims",[])
    except Exception as e:
        print(f"Groq Claims Extraction Failure: {e}")
        return []
    
async def generate_summary_title(claims: list) -> str:
    if not claims:
        return "Untitled scan"
    prompt = f"""
    Analyze these fact-checking claims and generate a punchy, highly descriptive 3 to 5 word summary title for an application history tab.
    Focus only on the main subject and event (e.g., "NEET-UG 2026 Paper Leak" or "RBI Digital Currency Update").
    Respond ONLY with the raw title string. Do not include quotes, markdown accents, or concluding periods.

    Claims: {json.dumps(claims)}
    """
    try:
        completion=client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role":"user", "content":prompt}],
            temperature=0.3,
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Title Generation Error: {e}")
        return "Awaiting Breakdown"