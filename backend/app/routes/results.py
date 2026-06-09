import json
from fastapi import APIRouter, HTTPException
from app.db import get_db_connection

router = APIRouter(
    tags=["Results History"]
)

@router.get("/history")
async def get_history_log():
    """
    Retrieves the top 10 most recent automated fact-checking scans 
    from the database to populate the frontend sidebar panel.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, url, title, overall_verdict, overall_explanation, claims, timestamp 
            FROM scans 
            ORDER BY timestamp DESC 
            LIMIT 10
        """)
        rows = cursor.fetchall()
        conn.close()
        
        history_list = []
        for r in rows:
            history_list.append({
                "id": r["id"],
                "url": r["url"],
                "title": r["title"] if r["title"] else r["url"],
                "overall_verdict": r["overall_verdict"],
                "overall_explanation": r["overall_explanation"],
                "claims": json.loads(r["claims"]),
                "timestamp": r["timestamp"]
            })
            
        return history_list
        
    except Exception as e:
        print(f"Database History Fetch Failure: {e}")
        return []