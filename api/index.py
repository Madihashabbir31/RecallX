import os
import sys
import logging
from pathlib import Path

# Mark as Vercel serverless environment
os.environ["VERCEL"] = "1"

# Resolve possible project root and backend paths
current_file = Path(__file__).resolve()
current_dir = current_file.parent
root_dir = current_dir.parent
backend_dir = root_dir / "backend"

candidates = [
    backend_dir,
    root_dir,
    current_dir,
    backend_dir / "app",
    Path.cwd(),
    Path.cwd() / "backend",
    Path("/var/task"),
    Path("/var/task/backend"),
    Path("/var/task/backend/app"),
]

for p in candidates:
    p_str = str(p)
    if p.exists() and p_str not in sys.path:
        sys.path.insert(0, p_str)

app = None
for import_module, attr in [
    ("app.main", "app"),
    ("backend.app.main", "app"),
    ("main", "app"),
]:
    try:
        mod = __import__(import_module, fromlist=[attr])
        app = getattr(mod, attr)
        break
    except (ImportError, ModuleNotFoundError):
        continue
    except Exception as e:
        logging.exception("Error loading FastAPI from %s: %s", import_module, e)
        raise

if app is None:
    # Final direct attempt to raise descriptive error if all candidates fail
    from app.main import app

# Export for Vercel Serverless Function runtime
handler = app
__all__ = ["app", "handler"]
