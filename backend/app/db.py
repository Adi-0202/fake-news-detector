import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL=os.getenv("DATABASE_URL")

if not  DATABASE_URL:
    raise ValueError("CRITICAL ERROR: DATABASE_URL environment variable is missing!")

engine=create_engine(DATABASE_URL)

sessionLocal=sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base=declarative_base()

def init_db():
    from app import models
    print("Connecting to cloud Neon PostgreSQL cluster...")

    Base.metadata.create_all(bind=engine)
    print("Database sync complete: Tables 'users' and 'reports' are live!")

def get_db():
    db=sessionLocal()
    try:
        yield db
    finally:
        db.close()