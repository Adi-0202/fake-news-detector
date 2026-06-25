import json
import asyncio
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.api_schemas import AnalyzeRequest, AnalysisResponse
from app.db import get_db
from app.models import User, Report

# Import our modular, single-responsibility services
from app.services.text_processor import normalize_raw_text
from app.services.pdf_processor import extract_text_from_pdf
from app.services.image_processor import extract_text_from_image
from app.services.claim_extractor import extract_claims_with_ai, generate_summary_title
from app.services.rag_verifier import parallel_verification_worker, calculate_overall_status

router = APIRouter(
    prefix="/analyze",
    tags=["Analysis Engine"]
)

async def execution_orchestrator(article_text: str, source_identifier: str, db: Session) -> dict:
    if not article_text.strip():
        raise HTTPException(status_code=400, detail="The extracted content payload contains no readable text.")

    claims_list = await extract_claims_with_ai(article_text)
    if not claims_list:
        raise HTTPException(status_code=422, detail="AI could not isolate verifiable assertions from the input source text.")

    tasks = [parallel_verification_worker(item["search_query"]) for item in claims_list]
    claims_results, summary_title = await asyncio.gather(
        asyncio.gather(*tasks),
        generate_summary_title(claims_list)
    )

    overall_verdict, overall_explanation = calculate_overall_status(claims_results)

    final_payload = {
        "title": summary_title,
        "overall_verdict": overall_verdict,
        "overall_explanation": overall_explanation,
        "claims": claims_results
    }

    try:
        default_user=db.query(User).first()
        if not default_user:
            default_user = User(email="demo@neuralsieve.local", hashed_password="placeholder_hash")
            db.add(default_user)
            db.commit()
            db.refresh(default_user)

        db_report=Report(
            user_id=default_user.id,
            title=summary_title,
            overall_verdict=overall_verdict,
            overall_explanation=overall_explanation,
            claims=claims_results,
            source_url=source_identifier
        )

        db.add(db_report)
        db.commit()
        print(f"Log entry saved to Neon cluster history for origin user block: {source_identifier}")
    except Exception as db_err:
        db.rollback()
        print(f"History Database Transaction Failed: {db_err}")

    return final_payload


@router.post("", response_model=AnalysisResponse)
async def analyze_payload(request: AnalyzeRequest, db: Session=Depends(get_db)):
    """Processes standardized web article URL links or raw text input entries."""
    print("Inbound request processing: JSON vector channel.")
    
    # if condition is for chrome extension scraping
    if request.text and request.text.strip() and request.url and request.url.strip():
        sanitized_text = normalize_raw_text(request.text)
        return await execution_orchestrator(sanitized_text, request.url.strip(), db)

    elif request.text and request.text.strip():
        sanitized_text = normalize_raw_text(request.text)
        return await execution_orchestrator(sanitized_text, "Raw Text Entry", db)
        
    raise HTTPException(status_code=400, detail="Invalid request parameters. Supply a valid URL or text block.")


@router.post("/pdf", response_model=AnalysisResponse)
async def analyze_pdf_document(file: UploadFile = File(...), db: Session=Depends(get_db)):
    """Ingests binary multi-page PDF documents, routes them through the extraction service, and initiates verification."""
    print(f"Inbound file upload processing: PDF stream -> {file.filename}")
    
    try:
        file_bytes = await file.read()
        extracted_text = extract_text_from_pdf(file_bytes)
        
        if not extracted_text:
            raise HTTPException(status_code=422, detail="The uploaded PDF document does not contain extractable text layouts.")
            
        sanitized_text = normalize_raw_text(extracted_text)
        return await execution_orchestrator(sanitized_text, f"PDF: {file.filename}", db)
        
    except RuntimeError as service_err:
        raise HTTPException(status_code=500, detail=str(service_err))


@router.post("/image", response_model=AnalysisResponse)
async def analyze_visual_forward(file: UploadFile = File(...), db: Session=Depends(get_db)):
    """Ingests image assets, extracts content strings via the OCR vision service, and initiates verification."""
    print(f"Inbound file upload processing: Image OCR stream -> {file.filename}")
    
    try:
        file_bytes = await file.read()
        extracted_text = extract_text_from_image(file_bytes)
        
        if not extracted_text:
            raise HTTPException(status_code=422, detail="No readable printed alphanumeric characters could be detected in this image.")
            
        sanitized_text = normalize_raw_text(extracted_text)
        return await execution_orchestrator(sanitized_text, f"Image: {file.filename}", db)
        
    except RuntimeError as service_err:
        raise HTTPException(status_code=500, detail=str(service_err))