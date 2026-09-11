import os, asyncio, contextlib, logging
from pathlib import Path
from contextlib import asynccontextmanager
from urllib.parse import parse_qs, urlencode
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import FRONTEND_URL, DEMO_MODE
from app.db.session import Base, engine, SessionLocal
from app.db.seed import seed
from app.services.care import process_due
from app.api.routes import router


async def reminder_loop():
    while True:
        try:
            with SessionLocal() as db:
                process_due(db)
        except Exception:
            logging.exception("Reminder processing failed")
        await asyncio.sleep(2)


def init_database():
    try:
        Base.metadata.create_all(engine)
        with SessionLocal() as db:
            if DEMO_MODE:
                seed(db)
    except Exception as err:
        logging.exception("Database initialization error: %s", err)


# Initialize immediately on module load so tables exist even if serverless skips ASGI lifespan
init_database()


@asynccontextmanager
async def lifespan(app):
    init_database()
    is_serverless = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
    task = None
    if not is_serverless:
        task = asyncio.create_task(reminder_loop())
    yield
    if task:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


app = FastAPI(title="RecallX API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def ensure_api_path(request, call_next):
    path = request.scope.get("path", "")

    # Check if request was rewritten to serverless function file or root API
    if "index.py" in path or "[...path]" in path or path in ("/api", "/api/"):
        # Check standard headers where original URL is preserved by reverse proxies
        orig_uri = (
            request.headers.get("x-forwarded-uri")
            or request.headers.get("x-rewrite-url")
            or request.headers.get("x-original-url")
            or ""
        )
        if orig_uri and not any(f in orig_uri for f in ("index.py", "[...path]")):
            path = orig_uri.split("?")[0]
        else:
            # Check query params for captured subpath
            captured = (
                request.query_params.get("match")
                or request.query_params.get("0")
                or request.query_params.get("path")
                or ""
            )
            if captured:
                clean_captured = captured.strip().lstrip("/")
                path = f"/api/{clean_captured}"
            else:
                path = path.replace("/api/index.py", "/api").replace("/index.py", "")

    # Clean leading and trailing artifacts
    if not path.startswith("/"):
        path = "/" + path
    if path.endswith("/index.py"):
        path = path[:-9] or "/"

    # Prefix routes if called without /api
    api_prefixes = (
        "/auth",
        "/patients",
        "/routine",
        "/medications",
        "/family",
        "/health",
        "/settings",
        "/alerts",
        "/reports",
        "/voice",
    )
    if any(path == prefix or path.startswith(prefix + "/") for prefix in api_prefixes):
        path = "/api" + path

    request.scope["path"] = path

    # Clean internal routing query parameters from query_string so routes receive clean params
    qs = request.scope.get("query_string", b"")
    if qs and any(k in qs for k in (b"match=", b"0=", b"path=")):
        try:
            params = parse_qs(qs.decode("latin1"), keep_blank_values=True)
            for k in ("match", "0", "1", "path"):
                params.pop(k, None)
            pairs = [(k, v) for k, vals in params.items() for v in vals]
            request.scope["query_string"] = urlencode(pairs).encode("latin1")
        except Exception:
            pass

    return await call_next(request)


@app.get("/health")
def root_health():
    return {"status": "ok", "app": "RecallX"}


app.include_router(router)


class SPAFiles(StaticFiles):
    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except Exception as error:
            if (
                getattr(error, "status_code", None) == 404
                and not path.startswith("api/")
                and "." not in path.rsplit("/", 1)[-1]
            ):
                return await super().get_response("index.html", scope)
            raise


frontend = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if frontend.exists():
    app.mount("/", SPAFiles(directory=frontend, html=True), name="frontend")
