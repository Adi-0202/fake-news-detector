import os
import json
from groq import Groq

GROQ_API_KEY=os.getenv("GROQ_API_KEY")
client=Groq(api_key=GROQ_API_KEY)

async def extract_claims_with_ai(text: str) -> list:
    if not text.strip():
        return []
    
    prompt = f"""
    You are an expert fact-checking extractor. Extract between 1 to 3 maximum high-impact, checkable factual claims from the news text provided below.
    DYNAMIC SIZING RULE: Do NOT pad data or extract minor/trivial assertions just to fill space. If the article text only contains 1 core verifiable news headline or fact, return exactly 1 object inside the array.
    
    COREFERENCE RESOLUTION CONSTRAINTS:
    1. Each claim statement must be completely SELF-CONTAINED, STANDALONE, and ATOMIC.
    2. Explicitly resolve all contextual pronouns and general nouns. Never use terms like "the paper", "the suspect", "the company", "the student", "the minister", or "the event".
    3. You must replace general nouns with their absolute Proper Nouns, Specific Titles, or Full Entity Identifiers present in the source text.
       - Structural Example:
         * Incomplete: "[Subject] was detained for selling the leaked question paper."
         * Complete: "[Full Name of Subject] was detained for allegedly selling the leaked [Specific Exam Name] question paper."
    4. A human reading a single claim completely out of context must understand exactly who, what, where, and when the claim refers to from that single sentence alone.

    SEARCH QUERY OPTIMIZATION CONSTRAINTS:
    1. For every extracted claim, you must formulate an optimized search engine query.
    2. Format this query as a highly targeted question or search string that a human investigator would type into Google or DuckDuckGo to manually verify if this specific claim is true.
    3. Include critical proper nouns, entity names, locations, and unique context keywords. Avoid vague phrases.

    You must respond ONLY with a JSON object matching this exact schema:
    {{
        "claims": [
            {{
                "claim": "Fully self-contained standalone factual claim sentence",
                "search_query": "Optimized investigator-style search question to verify this specific claim"
            }}
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
    
async def classify_input_intent(text: str) -> str:
    try:
        chat_completion = client.chat.completions.create(
            model="llama3-8b-8192", # Using a highly efficient, fast model for classification
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a strict text classification filter. Analyze the incoming text and classify it into exactly one word:\n"
                        "1. If the text is a casual greeting, conversational chit-chat, personal question, generic AI prompt, or creative request "
                        "(e.g., 'hi', 'how are you?', 'tell me a joke', 'write a poem about cars'), reply with exactly: CASUAL\n"
                        "2. If the text contains news items, public assertions, factual declarations, statements of events, headlines, or an article to be cross-examined, reply with exactly: VERIFIABLE\n\n"
                        "Rules: Respond with exactly ONE word ('CASUAL' or 'VERIFIABLE'). Do not include punctuation, reasoning, or formatting."
                    )
                },
                {
                    "role": "user",
                    "content": f"Text to classify: {text}"
                }
            ],
            temperature=0.0,
            max_tokens=3
        )
        
        verdict = chat_completion.choices[0].message.content.strip().upper()
        return verdict
    except Exception as e:
        print(f"Intent filter warning (defaulting to bypass): {e}")
        return "VERIFIABLE"