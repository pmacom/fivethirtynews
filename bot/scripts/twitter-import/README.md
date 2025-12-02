# Twitter Likes Import System

Complete system for importing your Twitter likes export data into the 530 platform, including media upload to Digital Ocean Spaces.

## Overview

This system processes Twitter data exports in 4 sequential steps:

1. **Analyze** - Examine export data and generate statistics
2. **Rename** - Standardize media filenames to `{tweetId}.{ext}`
3. **Upload** - Upload media to Digital Ocean Spaces with rate limiting
4. **Import** - Insert tweet data into Supabase database

## Prerequisites

### 1. Twitter Data Export

You need your Twitter archive with:
- `likes.js` - Contains your liked tweets data
- `tweets_media/` - Folder with images/videos

**Expected format:**
```javascript
window.YTD.like.part0 = [
  {
    "like": {
      "tweetId": "1977482213223764010",
      "fullText": "Tweet content here...",
      "expandedUrl": "https://twitter.com/i/web/status/..."
    }
  },
  // ... more tweets
]
```

### 2. Digital Ocean Spaces

- Active Digital Ocean account
- Spaces bucket created (e.g., `530society`)
- Access key and secret key generated
- CDN enabled (recommended for performance)

Get credentials at: https://cloud.digitalocean.com/account/api/tokens → Spaces Keys

### 3. Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Digital Ocean Spaces
DO_SPACES_KEY=your_access_key_here
DO_SPACES_SECRET=your_secret_key_here
DO_SPACES_BUCKET=530society
DO_SPACES_REGION=nyc3
DO_SPACES_ENDPOINT=nyc3.digitaloceanspaces.com
DO_SPACES_CDN=530society.nyc3.cdn.digitaloceanspaces.com
DO_SPACES_BASE_PATH=content

# Supabase (copy from web/.env.local)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key_here

# Rate Limiting (optional - defaults shown)
UPLOAD_BATCH_SIZE=10
UPLOAD_DELAY_MS=500
DB_INSERT_BATCH_SIZE=50
DB_INSERT_DELAY_MS=100
```

## Installation

Dependencies are already installed if you ran `pnpm install` at the root.

If needed:
```bash
pnpm add -w @aws-sdk/client-s3 dotenv mime-types
pnpm add -wD @types/mime-types tsx
```

## Setup

### 1. Place Your Twitter Export Files

```bash
# Create data directory
mkdir -p data/twitter-export

# Place your files:
# - data/twitter-export/likes.js
# - data/twitter-export/tweets_media/
```

**Directory structure:**
```
data/twitter-export/
├── likes.js                          # Your Twitter likes export
└── tweets_media/                     # Original media files
    ├── 164817455452139520-AkRh.jpg  # Original format
    └── ...
```

## Usage

### Step 1: Analyze Export

Examine your data and generate statistics:

```bash
npm run import:analyze
```

**Output:**
- Total tweets count
- Media files count
- File type breakdown (images/videos)
- Matching statistics (tweets with/without media)
- Sample data preview

**Example output:**
```
📊 ANALYSIS RESULTS
═══════════════════════════════════════════════════════════
📝 Liked Tweets:
   Total: 5,234

🖼️  Media Files:
   Total files: 3,891
   Images: 3,200
   Videos: 691

🔗 Media Matching:
   Tweets with media: 3,891 (74.3%)
   Tweets without media: 1,343 (25.7%)
```

### Step 2: Rename Media Files

Standardize filenames for easier processing:

```bash
npm run import:rename
```

**What it does:**
- Extracts tweet ID from original filename (`164817...AkRh.jpg` → `164817455452139520.jpg`)
- Handles multiple images per tweet (`{tweetId}-1.jpg`, `{tweetId}-2.jpg`)
- Copies files (originals preserved)
- Generates `media-mapping.json` for tracking

**Output directory:**
```
data/twitter-export/tweets_media_renamed/
├── 1977482213223764010.jpg
├── 1643928475214823424.jpg
├── 1643928475214823424-1.jpg  # Multiple images
└── ...
```

**Resume capability:** Safe to re-run, skips already renamed files.

### Step 3: Upload to Digital Ocean Spaces

Upload media with rate limiting to avoid API throttling:

```bash
npm run import:upload
```

**Features:**
- **Rate limited**: 10 files per batch, 500ms delay (configurable)
- **Resumable**: Skips already uploaded files
- **Progress tracking**: Real-time upload status
- **Public URLs**: Sets ACL to `public-read`

**Example output:**
```
☁️  Uploading Media to Digital Ocean Spaces...

✅ Connected to Digital Ocean Spaces
   Bucket: 530society
   Region: nyc3

📤 Batch 1/390 (10 files)
   ✅ 1977482213223764010.jpg
   ✅ 1643928475214823424.jpg
   ...
   Progress: 10/3891 (0.26%)

📤 Batch 2/390 (10 files)
   ...
```

**Generated files:**
- `upload-manifest.json` - Maps tweet IDs to CDN URLs

**Estimated time:** ~15-45 minutes for thousands of files (depends on file sizes and connection speed)

**Interruption safe:** Can Ctrl+C and resume later - already uploaded files are skipped.

### Step 4: Import to Database

Insert tweets into Supabase:

```bash
npm run import:db
```

**What it does:**
- Parses `likes.js` export
- Links media URLs from `upload-manifest.json`
- Inserts into `content` table with:
  - `platform`: "twitter"
  - `tags`: ["liked-tweets"]
  - `thumbnail_url`: DO Spaces CDN URL (if available)
  - `metadata`: Source info, media status

**Features:**
- **Rate limited**: 50 records per batch, 100ms delay
- **Duplicate handling**: Uses `ON CONFLICT` to skip existing tweets
- **Batch processing**: Efficient bulk inserts
- **Error recovery**: Retries failed batches individually

**Example output:**
```
💾 Importing Twitter Likes to Database...

✅ Parsed 5,234 liked tweets
📦 Prepared 5,234 records for import
📊 Records with media: 3,891
📊 Records without media: 1,343

💾 Batch 1/105 (50 records)
   ✅ Inserted 50 records
   Progress: 50/5234 (0.96%)
...

📊 IMPORT RESULTS
✅ Successfully inserted: 5,234
⏭️  Skipped (duplicates): 0
```

**Generated files:**
- `import-report.json` - Detailed import statistics and errors

## File Structure

```
scripts/twitter-import/
├── 1-analyze-export.ts        # Step 1: Analyze data
├── 2-rename-media.ts           # Step 2: Rename files
├── 3-upload-to-spaces.ts       # Step 3: Upload to DO Spaces
├── 4-import-to-db.ts           # Step 4: Import to database
├── utils/
│   ├── spaces-client.ts        # Digital Ocean Spaces helper
│   └── twitter-parser.ts       # Parse Twitter export format
└── README.md                   # This file

data/twitter-export/
├── likes.js                    # Your export (place here)
├── tweets_media/               # Original media (place here)
├── tweets_media_renamed/       # Renamed files (generated)
├── media-mapping.json          # Filename mappings (generated)
├── upload-manifest.json        # CDN URLs (generated)
└── import-report.json          # Import results (generated)
```

## Rate Limiting Configuration

Adjust in `.env` to control speed:

```env
# Upload to Digital Ocean Spaces
UPLOAD_BATCH_SIZE=10      # Files per batch (higher = faster but more aggressive)
UPLOAD_DELAY_MS=500       # Delay between batches (lower = faster)

# Database inserts
DB_INSERT_BATCH_SIZE=50   # Records per batch
DB_INSERT_DELAY_MS=100    # Delay between batches
```

**Recommended settings:**
- **Conservative** (safe for all APIs): `BATCH_SIZE=5`, `DELAY_MS=1000`
- **Default** (balanced): `BATCH_SIZE=10`, `DELAY_MS=500`
- **Aggressive** (fast, may hit rate limits): `BATCH_SIZE=20`, `DELAY_MS=200`

## Troubleshooting

### "Error: likes.js not found"
Place your Twitter export file at: `data/twitter-export/likes.js`

### "Error connecting to Digital Ocean Spaces"
- Check `.env` credentials are correct
- Verify bucket name and region match your Space
- Test credentials in DO dashboard

### "Could not parse Twitter likes file"
- Ensure file format is: `window.YTD.like.part0 = [...]`
- Check file is valid JavaScript/JSON
- Try opening in text editor to verify structure

### Upload fails with 403 Forbidden
- Verify Spaces access key has write permissions
- Check bucket ACL settings in DO dashboard

### Database insert fails with foreign key error
- Ensure Supabase is running: `npx supabase status`
- Check `content` table exists: `npm run db:counts`

### Out of memory during upload
- Reduce `UPLOAD_BATCH_SIZE` in `.env`
- Process in smaller chunks

## Viewing Imported Content

After import completes:

1. **Web interface:**
   ```bash
   npm run dev
   # Visit http://localhost:3000/embed
   # Filter by tag: "liked-tweets"
   ```

2. **Database query:**
   ```bash
   npm run db:counts
   ```

3. **Verify imports:**
   ```sql
   SELECT COUNT(*) FROM content WHERE platform = 'twitter' AND tags @> '["liked-tweets"]';
   ```

## Advanced Usage

### Re-import After Errors

If import failed partially:

```bash
# Clear failed imports
npm run db:reset-content

# Re-run import (will use existing uploaded media)
npm run import:db
```

### Update Existing Imports

Change `ignoreDuplicates: true` to `false` in `4-import-to-db.ts` to update existing records.

### Import Additional Likes

1. Export new likes from Twitter
2. Place new `likes.js` in `data/twitter-export/`
3. Run all 4 steps - duplicates will be skipped

## Performance

**Typical import times:**

| Tweets | Media Files | Rename | Upload | DB Import | Total |
|--------|-------------|--------|--------|-----------|-------|
| 1,000  | 500        | < 1s   | 5 min  | 30s       | ~6 min |
| 5,000  | 3,000      | 2s     | 20 min | 2 min     | ~25 min |
| 10,000 | 7,000      | 5s     | 45 min | 4 min     | ~50 min |

**Bottleneck:** Upload step (network-bound)

## Security Notes

- `.env` file is git-ignored (contains secrets)
- Media files are publicly accessible via CDN (by design)
- Original files in `data/` are never modified
- All generated files (`.json`) are git-ignored

## Next Steps

After successful import:

1. **Tag tweets** - Use admin interface to add more specific tags
2. **Filter content** - Use tag "liked-tweets" to find imports
3. **Verify media** - Check CDN URLs are accessible
4. **Clean up** - Optional: delete `data/` directory to save space

## Support

- Check `import-report.json` for detailed error logs
- Review `upload-manifest.json` for media upload status
- Run `npm run import:analyze` to re-check data

---

**Generated with:** 530 Twitter Import System v1.0
