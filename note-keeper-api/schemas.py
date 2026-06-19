from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NoteCreate(BaseModel):
    title: str
    content: Optional[str] = None
    color: Optional[str] = "#ffffff"


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    color: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None


class NoteResponse(BaseModel):
    id: int
    title: str
    content: Optional[str] = None
    color: str
    is_pinned: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    user_id: int

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: str
