import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT.parent / ".env")
load_dotenv(ROOT / ".env")
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL", f'sqlite:///{DATA / "recallx.db"}')
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"
DEMO_GRACE_SECONDS = int(os.getenv("DEMO_GRACE_SECONDS", "30"))
TIMEZONE = os.getenv("APP_TIMEZONE", "Asia/Kolkata")
SECRET_FILE = DATA / ".jwt_secret"
if not os.getenv("JWT_SECRET") and not SECRET_FILE.exists():
    import secrets

    SECRET_FILE.write_text(secrets.token_hex(32))
    SECRET_FILE.chmod(0o600)
JWT_SECRET = os.getenv("JWT_SECRET") or SECRET_FILE.read_text().strip()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
