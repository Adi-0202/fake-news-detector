import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.db import init_db, engine
from app import models
from app.routes import analyze, results, auth

app = FastAPI(
    title="Neural Sieve Cascade - Core API",
    version="2.0.0",
    description="Decoupled Multi-Channel Misinformation and Factual Verification Pipeline"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://fake-news-detector-tawny.vercel.app",
    ],
    allow_origin_regex=r"chrome-extension://.*", 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_populate_tables():
    print("--- Executing Application Boot Sequences ---")
    init_db()

@app.get("/")
def read_root():
    return {
        "project": "Neural Sieve Cascade - Core API",
        "status": "online",
        "version": "2.0.0"
    }

app.include_router(auth.router)
app.include_router(analyze.router)
app.include_router(results.router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)