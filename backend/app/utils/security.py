import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
import jwt #JSON Web Token library for encoding and decoding JWTs

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer #authentication scheme for OAuth2 with password and bearer token
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

SECRET_KEY = os.getenv("JWT_SECRET", "fallback-secret-key-for-local-dev")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password_bytes, salt)
    return hashed_bytes.decode("utf-8")

def verify_password(plain_password:str, hashed_password:str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), 
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False
    
def create_access_token(data: dict, expires_delta: Optional[timedelta]=None) -> str:
    to_encode=data.copy()

    if expires_delta:
        expire=datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str=Depends(oauth2_scheme), db: Session=Depends(get_db)) -> User:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload=jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str=payload.get("sub")

        if user_id is None:
            raise credentials_exception
        
    except jwt.PyJWTError:
        raise credentials_exception
    
    user=db.query(User).filter(User.id==int(user_id)).first()
    if user is None:
        raise credentials_exception
        
    return user