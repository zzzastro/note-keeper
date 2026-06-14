from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

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


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "Note Keeper API — go to /docs for Swagger UI"}


@app.post("/notes", response_model=schemas.NoteResponse, status_code=201)
def create_note(note: schemas.NoteCreate, db: Session = Depends(get_db)):
    db_note = models.Note(**note.model_dump())
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


@app.get("/notes", response_model=list[schemas.NoteResponse])
def list_notes(
    search: Optional[str] = Query(None),
    pinned: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(models.Note)
    if search:
        query = query.filter(
            models.Note.title.ilike(f"%{search}%")
            | models.Note.content.ilike(f"%{search}%")
        )
    if pinned is not None:
        query = query.filter(models.Note.is_pinned == pinned)
    return query.order_by(models.Note.updated_at.desc()).all()


@app.get("/notes/{note_id}", response_model=schemas.NoteResponse)
def get_note(note_id: int, db: Session = Depends(get_db)):
    note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@app.put("/notes/{note_id}", response_model=schemas.NoteResponse)
def update_note(
    note_id: int, note: schemas.NoteCreate, db: Session = Depends(get_db)
):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    for key, value in note.model_dump().items():
        setattr(db_note, key, value)
    db.commit()
    db.refresh(db_note)
    return db_note


@app.patch("/notes/{note_id}", response_model=schemas.NoteResponse)
def patch_note(
    note_id: int, note: schemas.NoteUpdate, db: Session = Depends(get_db)
):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    update_data = note.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_note, key, value)
    db.commit()
    db.refresh(db_note)
    return db_note


@app.patch("/notes/{note_id}/pin", response_model=schemas.NoteResponse)
def toggle_pin(note_id: int, db: Session = Depends(get_db)):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    db_note.is_pinned = not db_note.is_pinned
    db.commit()
    db.refresh(db_note)
    return db_note


@app.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: int, db: Session = Depends(get_db)):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(db_note)
    db.commit()
    return None
