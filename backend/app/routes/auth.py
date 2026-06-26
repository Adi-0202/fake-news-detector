from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import User
from app.schemas.auth_schemas import UserCreateSchema, TokenSchema
from app.utils.security import hash_password, verify_password, create_access_token

router = APIRouter(
    prefix="/auth",
    tags=["Authentication Engine"]
)

@router.post("/signup", status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreateSchema, db: Session = Depends(get_db)):
    # 1. Look up if the email is already registered
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # 2. Cryptographically hash the incoming plain-text password
    secured_hash = hash_password(payload.password)

    # 3. Save the new structural user entity record
    new_user = User(email=payload.email, hashed_password=secured_hash)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registration completed successfully!", "user_id": new_user.id}


@router.post("/login", response_model=TokenSchema)
def login_user(payload: UserCreateSchema, db: Session = Depends(get_db)):
    # 1. Fetch user by email address
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )

    # 2. Verify incoming password against the hashed string stored in the database
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )

    # 3. Create a state-free token encoded with user info
    jwt_token = create_access_token(data={"sub": str(user.id), "email": user.email})

    return {"access_token": jwt_token, "token_type": "bearer"}