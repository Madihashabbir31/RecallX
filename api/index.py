import os
import sys
from pathlib import Path

# Mark as Vercel serverless environment
os.environ["VERCEL"] = "1"

# Add repository root and backend directory to sys.path
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"

for path in [str(root_dir), str(backend_dir)]:
    if path not in sys.path:
        sys.path.insert(0, path)

from app.main import app

# Export both app and handler for Vercel serverless runtime
handler = app
__all__ = ["app", "handler"]
