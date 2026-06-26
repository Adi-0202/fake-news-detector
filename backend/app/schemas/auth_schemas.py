from pydantic import BaseModel, EmailStr, Field

class UserCreateSchema(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters long")

class TokenSchema(BaseModel):
    access_token: str
    token_type: str

    class Config:
        from_attributes = True