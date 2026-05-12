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
    return [
        {"claim_txt": "The Earth is flat.",
          "verdict": "False",
            "explanation": "Scientific evidence overwhelmingly supports that the Earth is an oblate spheroid."
            },
    ]