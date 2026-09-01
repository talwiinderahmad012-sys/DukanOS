import psycopg2
import sys
try:
    conn = psycopg2.connect('postgresql://postgres:ahmad@localhost:5432/dukaanos')
    cur = conn.cursor()
    cur.execute('SELECT email FROM "User" LIMIT 1')
    print('PYTHON PG SUCCESS:', cur.fetchone()[0])
    cur.close()
    conn.close()
except Exception as e:
    print('PYTHON PG ERROR:', e)
    sys.exit(1)
