from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Report, User
from app.utils.security import get_current_user

router = APIRouter(
    tags=["Results History"]
)

@router.get("/history")
async def get_history_log(db: Session = Depends(get_db), current_user: User=Depends(get_current_user)):
    """
    Retrieves the top 10 most recent automated fact-checking scans 
    from the database to populate the frontend sidebar panel.
    """
    try:
        reports = (
            db.query(Report)
            .filter(Report.user_id == current_user.id)
            .order_by(Report.timestamp.desc())
            .limit(10)
            .all()
        )
        
        history_list = []
        for r in reports:
            history_list.append({
                "id": r.id,
                "url": r.source_url,  
                "title": r.title if r.title else r.source_url,
                "overall_verdict": r.overall_verdict,
                "overall_explanation": r.overall_explanation,
                "claims": r.claims,   # Magic! SQLAlchemy delivers this natively as a Python list/dict array
                "timestamp": r.timestamp.strftime("%Y-%m-%d %H:%M:%S") if r.timestamp else None
            })
            
        return history_list
        
    except Exception as e:
        print(f"Database History Fetch Failure: {e}")
        return []