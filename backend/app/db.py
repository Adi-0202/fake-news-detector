import os
from sqlalchemy import create_engine #sqlalchemy is a python toolkit to convert python objects into actual sql queries and execute them on the database. 
                                     #create_engine is a factory function that creates a new SQLAlchemy Engine instance.
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker #orm(Object Relational Mapping).

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
        yield db #yield is basically a return statement that allows the function to return a value and then resume execution from where it left off when called again.
    finally:
        db.close()