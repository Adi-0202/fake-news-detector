import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from passlib.context import CryptContext
import jwt

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import User

pwd_context=CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

SECRET_KEY = os.getenv("JWT_SECRET", "fallback-secret-key-for-local-dev")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password:str, hashed_password:str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta]=None) -> str:
    to_encode=data.copy()

    if expires_delta:
        expire=datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def current_user(token: str=Depends(oauth2_scheme), db: Session=Depends(get_db)) -> User:

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