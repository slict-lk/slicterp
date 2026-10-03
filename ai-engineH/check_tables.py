import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('../.env')

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
""")

tables = cur.fetchall()

print("\n=== Tables with data ===\n")
for (table,) in tables:
    cur.execute(f'SELECT COUNT(*) FROM "{table}"')
    count = cur.fetchone()[0]
    if count > 0:
        print(f"✅ {table}: {count} rows")
    else:
        print(f"⬜ {table}: empty")

cur.close()
conn.close()