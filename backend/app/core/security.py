import hashlib, hmac, secrets
from datetime import datetime, timezone, timedelta
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from app.core.config import JWT_SECRET
from app.db.session import get_db
from app.models.entities import User, PatientCaregiverLink

bearer = HTTPBearer(auto_error=False)


def hash_password(password):
    salt = secrets.token_hex(16)
    return (
        salt
        + ":"
        + hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 600000).hex()
    )


def verify_password(password, stored):
    salt, expected = stored.split(":")
    actual = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), 600000
    ).hex()
    return hmac.compare_digest(actual, expected)


def token(user):
    return jwt.encode(
        {"sub": str(user.id), "exp": datetime.now(timezone.utc) + timedelta(hours=12)},
        JWT_SECRET,
        algorithm="HS256",
    )


def current_user(credentials=Depends(bearer), db: Session = Depends(get_db)):
    try:
        data = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = db.get(User, int(data["sub"]))
        if not user:
            raise ValueError()
        return user
    except (AttributeError, ValueError, KeyError, jwt.PyJWTError):
        raise HTTPException(401, "Please sign in again.")


def authorize(db, user, patient_id, caregiver=False):
    if caregiver and user.role != "caregiver":
        raise HTTPException(403, "A linked caregiver manages this information.")
    if user.role == "patient" and user.id == patient_id and not caregiver:
        return
    if (
        user.role == "caregiver"
        and db.query(PatientCaregiverLink)
        .filter_by(patient_id=patient_id, caregiver_id=user.id)
        .first()
    ):
        return
    raise HTTPException(403, "This patient is not linked to your account.")
