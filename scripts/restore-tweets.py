#!/usr/bin/env python3
"""
Restore tweets from SQL dump by parsing INSERT statements
"""

import re
import json
import psycopg2

conn = psycopg2.connect(
    host="127.0.0.1",
    port=54322,
    database="postgres",
    user="postgres",
    password="postgres"
)
conn.autocommit = True
cur = conn.cursor()

sql_path = "/Users/patrickmacom/MainQuests/530News/fivethirty/backups/pre_backfill_20251206_151642/data_backup.sql"

# Read the SQL file and find the tweets INSERT
with open(sql_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the INSERT INTO tweets statement
match = re.search(r'INSERT INTO "public"\."tweets"[^;]+VALUES\s*(.+?);(?=\s*(?:INSERT|ALTER|CREATE|RESET|$))', content, re.DOTALL)

if not match:
    print("Could not find tweets INSERT statement")
    exit(1)

values_str = match.group(1)

# Parse individual value tuples - this is tricky due to nested quotes and JSON
# We'll use a state machine approach
inserted = 0
errors = 0

# Split by '),\n\t(' which is how pg_dump formats multi-row inserts
rows = re.split(r"\),\s*\n\s*\(", values_str)

for i, row in enumerate(rows):
    # Clean up the row
    row = row.strip()
    if row.startswith('('):
        row = row[1:]
    if row.endswith(')'):
        row = row[:-1]

    try:
        # Try to extract the id and data fields (first two fields)
        # The format is: 'id', 'json_data', 'created_at', 'updated_at', 'text', ...

        # Find the first field (id)
        id_match = re.match(r"'([^']+)'", row)
        if not id_match:
            continue
        tweet_id = id_match.group(1)

        # Skip to after first field
        rest = row[id_match.end():].lstrip(', ')

        # Find the JSON data field (second field) - it's complex JSON
        if rest.startswith("'"):
            # Find the end of the JSON string
            depth = 0
            in_string = True
            end_pos = 1
            while end_pos < len(rest):
                char = rest[end_pos]
                if char == "'" and (end_pos + 1 >= len(rest) or rest[end_pos + 1] != "'"):
                    # End of string (not escaped quote)
                    break
                elif char == "'" and rest[end_pos + 1] == "'":
                    # Escaped quote, skip both
                    end_pos += 2
                    continue
                end_pos += 1

            json_str = rest[1:end_pos].replace("''", "'")

            try:
                json_data = json.loads(json_str)
            except:
                json_data = {}
        else:
            json_data = {}

        # Insert the tweet with just id and data
        cur.execute("""
            INSERT INTO tweets (id, data)
            VALUES (%s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (tweet_id, json.dumps(json_data)))

        inserted += 1
        if inserted % 100 == 0:
            print(f"Inserted {inserted} tweets...")

    except Exception as e:
        errors += 1
        if errors <= 3:
            print(f"Error on row {i}: {e}")
        continue

cur.close()
conn.close()

print(f"\nDone! Inserted: {inserted}, Errors: {errors}")
