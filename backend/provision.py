"""Create a patient and their linked caregiver without enabling demo access."""

from getpass import getpass
from app.db.session import Base, engine, SessionLocal
from app.models.entities import (
    User,
    PatientProfile,
    CaregiverProfile,
    PatientCaregiverLink,
    UserSettings,
)
from app.core.security import hash_password

Base.metadata.create_all(engine)
with SessionLocal() as db:
    ids = []
    for role, profile in [("patient", PatientProfile), ("caregiver", CaregiverProfile)]:
        name = input(f"{role} name: ").strip()
        email = input(f"{role} email: ").strip().lower()
        password = getpass(f"{role} password (at least 12 characters): ")
        if not name or "@" not in email or len(password) < 12:
            raise SystemExit("Invalid name, email, or password.")
        if db.query(User).filter_by(email=email).first():
            raise SystemExit("An account with this email already exists.")
        user = User(
            name=name, email=email, role=role, password_hash=hash_password(password)
        )
        db.add(user)
        db.flush()
        db.add_all([profile(user_id=user.id), UserSettings(user_id=user.id)])
        ids.append(user.id)
    db.add(PatientCaregiverLink(patient_id=ids[0], caregiver_id=ids[1]))
    db.commit()
print("Patient and caregiver accounts created and linked.")
