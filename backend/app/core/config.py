import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT.parent / ".env")
load_dotenv(ROOT / ".env")
is_serverless = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
if is_serverless:
    DATA = Path("/tmp/recallx_data")
else:
    data_env = os.getenv("DATA_DIR")
    if data_env:
        DATA = Path(data_env)
    else:
        try:
            DATA = ROOT / "data"
            DATA.mkdir(parents=True, exist_ok=True)
        except OSError:
            DATA = Path("/tmp/recallx_data")

DATA.mkdir(parents=True, exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL", f'sqlite:///{DATA / "recallx.db"}')
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"
DEMO_GRACE_SECONDS = int(os.getenv("DEMO_GRACE_SECONDS", "30"))
TIMEZONE = os.getenv("APP_TIMEZONE", "Asia/Kolkata")

SECRET_FILE = DATA / ".jwt_secret"
if not os.getenv("JWT_SECRET") and not SECRET_FILE.exists():
    import secrets

    try:
        SECRET_FILE.write_text(secrets.token_hex(32))
        SECRET_FILE.chmod(0o600)
    except Exception:
        pass

if os.getenv("JWT_SECRET"):
    JWT_SECRET = os.getenv("JWT_SECRET")
elif SECRET_FILE.exists():
    JWT_SECRET = SECRET_FILE.read_text().strip()
else:
    JWT_SECRET = "recallx-default-secure-secret-key-2026"

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
