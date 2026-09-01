import psycopg2
conn = psycopg2.connect('postgresql://postgres:ahmad@localhost:5432/dukaanos')
cur = conn.cursor()
cur.execute('SELECT email FROM "User" LIMIT 1')
print(cur.fetchone()[0])
