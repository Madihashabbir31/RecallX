import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import DATABASE_URL


class Base(DeclarativeBase):
    pass


db_url = DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    db_url,
    connect_args=(
        {"check_same_thread": False} if db_url.startswith("sqlite") else {}
    ),
)
if db_url.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def pragmas(conn, _):
        try:
            cursor = conn.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            if not os.getenv("VERCEL") and not os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
                cursor.execute("PRAGMA journal_mode=WAL")
            else:
                cursor.execute("PRAGMA journal_mode=DELETE")
            cursor.close()
        except Exception:
            try:
                conn.execute("PRAGMA foreign_keys=ON")
            except Exception:
                pass


SessionLocal = sessionmaker(engine, expire_on_commit=False)


def get_db():
    with SessionLocal() as db:
        yield db
