from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from .. import models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..ws_manager import manager

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=List[schemas.UserOut])
def list_contacts(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    contacts = (
        db.query(models.Contact).filter(models.Contact.owner_id == current_user.id).all()
    )
    users = []
    for c in contacts:
        u = db.query(models.User).filter(models.User.id == c.contact_id).first()
        if u:
            u.is_online = manager.is_online(u.id)
            users.append(u)
    return users


@router.get("/search", response_model=List[schemas.UserOut])
def search_users(
    q: Optional[str] = "",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.User).filter(models.User.id != current_user.id)
    if q:
        query = query.filter(
            or_(
                models.User.display_name.ilike(f"%{q}%"),
                models.User.phone_or_username.ilike(f"%{q}%"),
            )
        )
    results = query.limit(20).all()
    for u in results:
        u.is_online = manager.is_online(u.id)
    return results


@router.post("", response_model=schemas.UserOut)
def add_contact(
    payload: schemas.AddContactIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    target = (
        db.query(models.User)
        .filter(models.User.phone_or_username == payload.phone_or_username)
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")

    existing = (
        db.query(models.Contact)
        .filter(
            models.Contact.owner_id == current_user.id,
            models.Contact.contact_id == target.id,
        )
        .first()
    )
    if existing:
        return target

    db.add(models.Contact(owner_id=current_user.id, contact_id=target.id))
    db.commit()
    target.is_online = manager.is_online(target.id)
    return target
