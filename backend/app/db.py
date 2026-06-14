import os
import sqlite3

DB_PATH=os.getenv("DATABASE_URL", "fact_checker.db")

def get_db_connection():
    conn=sqlite3.connect(DB_PATH)
    conn.row_factory=sqlite3.Row
    return conn

def init_db():
    conn=get_db_connection()
    cursor=conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT,
            title TEXT,
            overall_verdict TEXT,
            overall_explanation TEXT,
            claims TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()
    print(f"Database intialized at: {DB_PATH}")