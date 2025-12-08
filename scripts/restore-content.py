#!/usr/bin/env python3
"""
Restore content from backup CSV with proper data handling
"""

import csv
import json
import psycopg2
from psycopg2.extras import Json

# Database connection
conn = psycopg2.connect(
    host="127.0.0.1",
    port=54322,
    database="postgres",
    user="postgres",
    password="postgres"
)
conn.autocommit = True  # Each insert is its own transaction
cur = conn.cursor()

# CSV file path
csv_path = "/Users/patrickmacom/MainQuests/530News/fivethirty/backups/pre_backfill_20251206_151642/content.csv"

def parse_json_field(value):
    """Parse a JSON field that might be in various formats"""
    if not value or value == '':
        return []
    if value == '{}':
        return []
    try:
        # Try direct JSON parse
        return json.loads(value)
    except:
        pass
    try:
        # Try unescaping double-quoted strings
        if value.startswith('"') and value.endswith('"'):
            value = value[1:-1].replace('""', '"')
            return json.loads(value)
    except:
        pass
    return []

def parse_uuid_or_none(value):
    """Parse UUID or return None"""
    if not value or value == '' or value == 'NULL':
        return None
    return value

# Read and insert
inserted = 0
errors = 0

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        try:
            # Parse JSON fields
            channels = parse_json_field(row.get('channels', '[]'))
            media_assets = parse_json_field(row.get('media_assets', '[]'))
            metadata = parse_json_field(row.get('metadata', '{}')) or {}
            tags = parse_json_field(row.get('tags', '[]'))
            categories = parse_json_field(row.get('categories', '[]'))

            cur.execute("""
                INSERT INTO content (
                    id, version, content_type, content_url, content_id,
                    content_created_at, thumbnail_url, submitted_by, submitted_at,
                    category, description, created_at, updated_at, channels,
                    primary_channel, approval_status, submitted_by_user_id,
                    approved_by, approved_at, approval_reason, platform,
                    platform_content_id, url, title, author_name, author_username,
                    author_url, author_avatar_url, author_id, media_assets,
                    metadata, tags, categories
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s
                )
                ON CONFLICT (id) DO NOTHING
            """, (
                row['id'],
                int(row['version']) if row['version'] else 1,
                row['content_type'] or None,
                row['content_url'] or None,
                row['content_id'] or None,
                row['content_created_at'] or None,
                row['thumbnail_url'] or None,
                row['submitted_by'] or 'unknown',
                row['submitted_at'] or None,
                row['category'] or None,
                row['description'] or None,
                row['created_at'] or None,
                row['updated_at'] or None,
                Json(channels),
                row['primary_channel'] or None,
                row['approval_status'] or 'approved',
                parse_uuid_or_none(row.get('submitted_by_user_id')),
                parse_uuid_or_none(row.get('approved_by')),
                row['approved_at'] or None,
                row['approval_reason'] or None,
                row['platform'] or None,
                row['platform_content_id'] or None,
                row['url'] or None,
                row['title'] or None,
                row['author_name'] or None,
                row['author_username'] or None,
                row['author_url'] or None,
                row['author_avatar_url'] or None,
                row.get('author_id') or None,
                Json(media_assets),
                Json(metadata),
                Json(tags),
                Json(categories)
            ))
            inserted += 1
            if inserted % 500 == 0:
                print(f"Inserted {inserted} rows...")
        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"Error on row {inserted + errors}: {e}")
                print(f"  Row ID: {row.get('id', 'unknown')}")
            continue

cur.close()
conn.close()

print(f"\nDone! Inserted: {inserted}, Errors: {errors}")
