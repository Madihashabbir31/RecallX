import asyncio, contextlib, logging
from pathlib import Path
from contextlib import asynccontextmanager
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


@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if DEMO_MODE:
            seed(db)
    task = asyncio.create_task(reminder_loop())
    yield
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task


app = FastAPI(title="RecallX API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(
        set([FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"])
    ),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
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
