from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import os

for p in [os.path.join(os.path.dirname(__file__), '..', '.env'), '.env']:
    if os.path.exists(p):
        with open(p) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, _, val = line.partition('=')
                    os.environ.setdefault(key.strip(), val.strip())

import auth
import database
import models
import schemas

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")

models.Base.metadata.create_all(bind=database.engine)
from sqlalchemy import text
with database.engine.connect() as conn:
    for col, stmt in [
        ("is_admin", "ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"),
        ("created_at", "ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"),
    ]:
        try:
            conn.execute(text(stmt))
            conn.commit()
        except Exception:
            pass

app = FastAPI(
    title="Note Keeper API",
    description="A Google Keep clone API",
    version="1.0.0",
    openapi_tags=[
        {"name": "System", "description": "Health check"},
        {"name": "Auth", "description": "Register, login, refresh, logout"},
        {"name": "Account", "description": "Delete account"},
        {"name": "Notes", "description": "CRUD for notes"},
        {"name": "Admin", "description": "Admin-only operations"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["System"])
def root():
    return {"message": "Note Keeper API — go to /docs for Swagger UI"}


@app.post("/register", response_model=schemas.UserResponse, status_code=201, tags=["Auth"])
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    db_user = models.User(
        email=user.email,
        hashed_password=auth.hash_password(user.password),
        is_admin=user.email == ADMIN_EMAIL,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/login", response_model=schemas.Token, tags=["Auth"])
def login(credentials: schemas.LoginRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access_token = auth.create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": "admin" if user.is_admin else "user",
        "ver": user.token_version,
    })
    refresh_token = auth.create_refresh_token(db, user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
    }


@app.post("/refresh", response_model=schemas.Token, tags=["Auth"])
def refresh(req: schemas.RefreshRequest, db: Session = Depends(database.get_db)):
    db_token = auth.verify_refresh_token(db, req.refresh_token)
    user = db.query(models.User).filter(models.User.id == db_token.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    new_access = auth.create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": "admin" if user.is_admin else "user",
        "ver": user.token_version,
    })
    new_refresh = auth.rotate_refresh_token(db, req.refresh_token)
    return {
        "access_token": new_access,
        "token_type": "bearer",
        "refresh_token": new_refresh,
    }


@app.post("/logout", tags=["Auth"])
def logout(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    auth.revoke_all_tokens(db, current_user.id)
    return {
        "message": "Logged out successfully",
        "email": current_user.email,
        "token_version": current_user.token_version,
    }


@app.delete("/account", tags=["Account"])
def delete_account(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    notes_count = db.query(models.Note).filter(
        models.Note.user_id == current_user.id
    ).count()
    db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == current_user.id
    ).delete()
    db.query(models.Note).filter(models.Note.user_id == current_user.id).delete()
    email = current_user.email
    db.delete(current_user)
    db.commit()
    return {
        "message": "Account deleted",
        "email": email,
        "notes_deleted": notes_count,
    }


@app.get("/admin/users", tags=["Admin"])
def admin_list_users(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    users = db.query(models.User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "is_admin": u.is_admin,
            "created_at": u.created_at.isoformat() + 'Z' if u.created_at else None,
            "notes_count": len(u.notes),
        }
        for u in users
    ]


@app.patch("/admin/users/{user_id}", tags=["Admin"])
def admin_update_user(
    user_id: int,
    data: schemas.UserUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.email is not None:
        existing = db.query(models.User).filter(models.User.email == data.email, models.User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = data.email
    if data.password is not None:
        user.hashed_password = auth.hash_password(data.password)
    db.commit()
    return {"id": user.id, "email": user.email, "is_admin": user.is_admin}


@app.get("/admin/notes", tags=["Admin"])
def admin_list_notes(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    notes = db.query(models.Note).order_by(models.Note.updated_at.desc()).all()
    return [
        {
            "id": n.id,
            "title": n.title,
            "content": n.content,
            "color": n.color,
            "is_pinned": n.is_pinned,
            "is_archived": n.is_archived,
            "created_at": (n.created_at.isoformat() + 'Z') if n.created_at else None,
            "updated_at": (n.updated_at.isoformat() + 'Z') if n.updated_at else None,
            "user_id": n.user_id,
            "user_email": n.user.email,
        }
        for n in notes
    ]


@app.delete("/admin/users/{user_id}", tags=["Admin"])
def admin_delete_user(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user_id).delete()
    db.query(models.Note).filter(models.Note.user_id == user_id).delete()
    email = user.email
    db.delete(user)
    db.commit()
    return {"message": "User deleted", "email": email}


@app.patch("/admin/users/{user_id}/admin", tags=["Admin"])
def admin_toggle_admin(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own admin status")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = not user.is_admin
    db.commit()
    return {"id": user.id, "email": user.email, "is_admin": user.is_admin}


@app.get("/admin/stats", tags=["Admin"])
def admin_stats(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    total_users = db.query(models.User).count()
    total_notes = db.query(models.Note).count()
    pinned_notes = db.query(models.Note).filter(models.Note.is_pinned == True).count()
    admins = db.query(models.User).filter(models.User.is_admin == True).count()
    return {
        "total_users": total_users,
        "total_notes": total_notes,
        "pinned_notes": pinned_notes,
        "admins": admins,
    }


@app.delete("/admin/notes/{note_id}", tags=["Admin"])
def admin_delete_note(
    note_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    title = note.title
    db.delete(note)
    db.commit()
    return {"message": "Note deleted", "id": note_id, "title": title}


@app.get("/admin/export", tags=["Admin"])
def admin_export(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    users = db.query(models.User).all()
    notes = db.query(models.Note).all()
    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "users": [
            {"id": u.id, "email": u.email, "is_admin": u.is_admin, "notes_count": len(u.notes)}
            for u in users
        ],
        "notes": [
            {
                "id": n.id, "title": n.title, "content": n.content, "color": n.color,
                "is_pinned": n.is_pinned, "is_archived": n.is_archived,
                "created_at": (n.created_at.isoformat() + 'Z') if n.created_at else None,
                "updated_at": (n.updated_at.isoformat() + 'Z') if n.updated_at else None,
                "user_id": n.user_id, "user_email": n.user.email,
            }
            for n in notes
        ],
    }


@app.post("/notes", response_model=schemas.NoteResponse, status_code=201, tags=["Notes"])
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


@app.get("/notes", response_model=list[schemas.NoteResponse], tags=["Notes"])
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


@app.get("/notes/{note_id}", response_model=schemas.NoteResponse, tags=["Notes"])
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


@app.put("/notes/{note_id}", response_model=schemas.NoteResponse, tags=["Notes"])
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


@app.patch("/notes/{note_id}", response_model=schemas.NoteResponse, tags=["Notes"])
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


@app.patch("/notes/{note_id}/pin", response_model=schemas.NoteResponse, tags=["Notes"])
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


@app.delete("/notes/{note_id}", tags=["Notes"])
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
    title = db_note.title
    db.delete(db_note)
    db.commit()
    return {
        "message": "Note deleted",
        "id": note_id,
        "title": title,
    }
