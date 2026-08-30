import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # Postgres (Supabase) en producción: persiste fuera del contenedor del backend.
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
else:
    # SQLite local para desarrollo cuando no hay DATABASE_URL configurada.
    engine = create_engine(
        "sqlite:///./inventory.db", connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
