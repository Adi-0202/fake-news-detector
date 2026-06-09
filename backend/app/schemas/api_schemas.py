from pydantic import BaseModel, Field
from typing import Optional, List

class AnalyzeRequest(BaseModel):
    url: Optional[str] = Field(default="", description="The target article URL link to scrap context from.")
    text: Optional[str] = Field(default="", description="Pasted raw content, rumor strings, or messaging chains.")

class ClaimSource(BaseModel):
    title: str
    url: str

class AtomicClaimResult(BaseModel):
    claim_text: str  # Fixed from claim_txt to match pipeline output exactly
    verdict: str     # 'SUPPORTED', 'REFUTED', or 'UNVERIFIED'
    explanation: str
    sources: List[ClaimSource]

class AnalysisResponse(BaseModel):
    title: str
    overall_verdict: str
    overall_explanation: str
    claims: List[AtomicClaimResult]