import os
import sys
from pathlib import Path

# Mark as Vercel serverless environment
os.environ["VERCEL"] = "1"

# Add backend directory to sys.path so app modules can be loaded
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app

# Export for Vercel Serverless Function
__all__ = ["app"]
