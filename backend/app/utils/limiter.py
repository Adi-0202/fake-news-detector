from fastapi import HTTPException, status, Depends
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from typing import Dict, List

from app.utils.security import get_current_user 
from app.models import User

analyze_history_cache: Dict[str, List[datetime]] = defaultdict(list)

def rate_limit_analyze(current_user: User = Depends(get_current_user)):
    user_key = current_user.email  
    now = datetime.now(timezone.utc)
    
    window_duration = timedelta(hours=24)
    cutoff_time = now - window_duration
    
    # Purge timestamps older than 24 hours from this user's profile log
    analyze_history_cache[user_key] = [
        timestamp for timestamp in analyze_history_cache[user_key] 
        if timestamp > cutoff_time
    ]
    
    if len(analyze_history_cache[user_key]) >= 10:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. You can run up to 10 analyses every 24 hours."
        )
    
    analyze_history_cache[user_key].append(now)
    return True