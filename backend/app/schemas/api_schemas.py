from pydantic import BaseModel

class AnalyzeRequest(BaseModel):
    url: str

class ClaimResult(BaseModel):
    claim_txt: str
    verdict: str
    explanation: str

