from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import auth
import database
import models
import schemas

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="Note Keeper API",
    description="A Google Keep clone API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Note Keeper API — go to /docs for Swagger UI"}


@app.post("/register", response_model=schemas.UserResponse, status_code=201)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    db_user = models.User(
        email=user.email,
        hashed_password=auth.hash_password(user.password),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/login", response_model=schemas.Token)
def login(credentials: schemas.LoginRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access_token = auth.create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "ver": user.token_version,
    })
    refresh_token = auth.create_refresh_token(db, user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
    }


@app.post("/refresh", response_model=schemas.Token)
def refresh(req: schemas.RefreshRequest, db: Session = Depends(database.get_db)):
    db_token = auth.verify_refresh_token(db, req.refresh_token)
    user = db.query(models.User).filter(models.User.id == db_token.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    new_access = auth.create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "ver": user.token_version,
    })
    new_refresh = auth.rotate_refresh_token(db, req.refresh_token)
    return {
        "access_token": new_access,
        "token_type": "bearer",
        "refresh_token": new_refresh,
    }


@app.post("/logout", status_code=204)
def logout(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    auth.revoke_all_tokens(db, current_user.id)
    return None


@app.post("/notes", response_model=schemas.NoteResponse, status_code=201)
def create_note(
    note: schemas.NoteCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db_note = models.Note(**note.model_dump(), user_id=current_user.id)
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


@app.get("/notes", response_model=list[schemas.NoteResponse])
def list_notes(
    search: Optional[str] = Query(None),
    pinned: Optional[bool] = Query(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    query = db.query(models.Note).filter(models.Note.user_id == current_user.id)
    if search:
        query = query.filter(
            models.Note.title.ilike(f"%{search}%")
            | models.Note.content.ilike(f"%{search}%")
        )
    if pinned is not None:
        query = query.filter(models.Note.is_pinned == pinned)
    return query.order_by(models.Note.updated_at.desc()).all()


@app.get("/notes/{note_id}", response_model=schemas.NoteResponse)
def get_note(
    note_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    note = (
        db.query(models.Note)
        .filter(models.Note.id == note_id, models.Note.user_id == current_user.id)
        .first()
    )
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@app.put("/notes/{note_id}", response_model=schemas.NoteResponse)
def update_note(
    note_id: int,
    note: schemas.NoteCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db_note = (
        db.query(models.Note)
        .filter(models.Note.id == note_id, models.Note.user_id == current_user.id)
        .first()
    )
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    for key, value in note.model_dump().items():
        setattr(db_note, key, value)
    db.commit()
    db.refresh(db_note)
    return db_note


@app.patch("/notes/{note_id}", response_model=schemas.NoteResponse)
def patch_note(
    note_id: int,
    note: schemas.NoteUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db_note = (
        db.query(models.Note)
        .filter(models.Note.id == note_id, models.Note.user_id == current_user.id)
        .first()
    )
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    update_data = note.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_note, key, value)
    db.commit()
    db.refresh(db_note)
    return db_note


@app.patch("/notes/{note_id}/pin", response_model=schemas.NoteResponse)
def toggle_pin(
    note_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db_note = (
        db.query(models.Note)
        .filter(models.Note.id == note_id, models.Note.user_id == current_user.id)
        .first()
    )
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    db_note.is_pinned = not db_note.is_pinned
    db.commit()
    db.refresh(db_note)
    return db_note


@app.delete("/notes/{note_id}", status_code=204)
def delete_note(
    note_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db_note = (
        db.query(models.Note)
        .filter(models.Note.id == note_id, models.Note.user_id == current_user.id)
        .first()
    )
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(db_note)
    db.commit()
    return None
