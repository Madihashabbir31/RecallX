"""Create the initial SQLAlchemy schema; optionally seed demo accounts."""

from app.db.session import Base, engine, SessionLocal
from app.db.seed import seed
from app.core.config import DEMO_MODE

Base.metadata.create_all(engine)
with SessionLocal() as db:
    if DEMO_MODE:
        seed(db)
print("RecallX database initialized.")
