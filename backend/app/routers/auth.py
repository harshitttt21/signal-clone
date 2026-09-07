from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import create_access_token, get_current_user, MOCK_OTP
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/request-otp")
def request_otp(payload: schemas.RequestOtpIn):
    # Mocked: in a real app this would send an SMS. We just return the fixed code.
    return {"message": f"OTP sent (mocked). Use {MOCK_OTP} to continue."}


@router.post("/register", response_model=schemas.AuthOut)
def register(payload: schemas.RegisterIn, db: Session = Depends(get_db)):
    if payload.otp != MOCK_OTP:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    existing = (
        db.query(models.User)
        .filter(models.User.phone_or_username == payload.phone_or_username)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="User already exists, please login")

    user = models.User(
        phone_or_username=payload.phone_or_username,
        display_name=payload.display_name,
        avatar_url=payload.avatar_url,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return schemas.AuthOut(access_token=token, user=user)


@router.post("/login", response_model=schemas.AuthOut)
def login(payload: schemas.LoginIn, db: Session = Depends(get_db)):
    if payload.otp != MOCK_OTP:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    user = (
        db.query(models.User)
        .filter(models.User.phone_or_username == payload.phone_or_username)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="No account found, please register")

    token = create_access_token(user.id)
    return schemas.AuthOut(access_token=token, user=user)


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user
