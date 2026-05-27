from pydantic import BaseModel, Field
from typing import Optional

class AnalyzeRequest(BaseModel):
    url: Optional[str] = Field(default="")
    text: Optional[str] = Field(default="")

class ClaimResult(BaseModel):
    claim_txt: str
    verdict: str
    explanation: str

