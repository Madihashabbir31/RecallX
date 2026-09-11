import os
import sys
from pathlib import Path

# Mark as Vercel serverless environment
os.environ["VERCEL"] = "1"

# Resolve directories
current_dir = Path(__file__).resolve().parent
root_dir = current_dir.parent
backend_dir = root_dir / "backend"

candidates = [
    str(backend_dir),
    str(root_dir),
    str(current_dir),
    os.getcwd(),
    os.path.join(os.getcwd(), "backend"),
    "/var/task",
    "/var/task/backend",
]

for p in candidates:
    if p and os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

try:
    from app.main import app
except ImportError:
    try:
        from backend.app.main import app
    except ImportError:
        sys.path.insert(0, str(backend_dir / "app"))
        from main import app

# Export for Vercel Serverless Function runtime
handler = app
__all__ = ["app", "handler"]
