import os
import sys
from pathlib import Path

current_dir = str(Path(__file__).resolve().parent)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

try:
    from api.index import app, handler
except (ImportError, ModuleNotFoundError):
    try:
        from .index import app, handler
    except (ImportError, ValueError):
        from index import app, handler

__all__ = ["app", "handler"]
