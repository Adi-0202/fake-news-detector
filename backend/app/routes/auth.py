import secrets
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.db import get_db
from app.models import User
from app.schemas.auth_schemas import UserCreateSchema, TokenSchema
from app.utils.security import hash_password, verify_password, create_access_token

router = APIRouter(
    prefix="/auth",
    tags=["Authentication Engine"]
)

# ── NEW: SELF-CONTAINED VALIDATION SCHEMA FOR RESET FLOWS ──
class ResetPasswordSchema(BaseModel):
    email: str
    recovery_key: str
    new_password: str


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreateSchema, db: Session = Depends(get_db)):
    # 1. Look up if the email is already registered
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # 2. Generate a secure, self-contained alphanumeric recovery token string
    raw_recovery_key = f"NSC-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}"

    # 3. Cryptographically hash the credentials
    secured_hash = hash_password(payload.password)
    secured_recovery_hash = hash_password(raw_recovery_key)

    # 4. Save the structural user entity record with the emergency store key hash
    new_user = User(
        email=payload.email, 
        hashed_password=secured_hash,
        hashed_recovery_key=secured_recovery_hash
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Return the clean recovery key to the frontend ONLY ONCE during this signup stream
    return {
        "message": "User registration completed successfully!", 
        "user_id": new_user.id,
        "recovery_key": raw_recovery_key
    }


@router.post("/login", response_model=TokenSchema)
def login_user(payload: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Fetch user by email address
    user = db.query(User).filter(User.email == payload.username).first()
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


# ── NEW: ANONYMOUS PASSKEY AMENDMENT PORT ──
@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(payload: ResetPasswordSchema, db: Session = Depends(get_db)):
    # 1. Locate targeting user profile context
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account context mapped to this email identity."
        )

    # 2. Cross-examine inbound recovery text payload against secure db storage hash
    if not verify_password(payload.recovery_key, user.hashed_recovery_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid emergency system recovery token code."
        )

    # 3. Generate new structural secure hashes and rewrite persistent states
    user.hashed_password = hash_password(payload.new_password)
    db.commit()

    return {"detail": "Credential authorization records successfully updated. Return to login portal."}