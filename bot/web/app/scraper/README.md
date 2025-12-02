# Twitter Author Scraper

Automated tool to extract author data from Twitter embeds and populate the database.

## How It Works

1. **Queries** the database for tweets without author information
2. **Loads** each tweet's Twitter embed
3. **Extracts** author data from the embedded iframe DOM
4. **Updates** both the `creators` and `content` tables
5. **Auto-advances** to the next tweet

## Usage

### Access the Scraper
Navigate to: `http://localhost:3000/scraper`

### Manual Mode
1. Click "Process Current" to scrape one tweet at a time
2. Use "Previous" / "Next" to navigate
3. Review results before moving on

### Auto Mode (Recommended)
1. Click "Start Auto Mode"
2. Scraper will automatically:
   - Load embed
   - Wait 3 seconds for embed to render
   - Extract author data
   - Save to database
   - Move to next tweet
3. Click "Stop Auto Mode" to pause

## What Gets Extracted

- **Username** (@handle)
- **Display Name** (full name)
- **Avatar URL** (profile picture)
- **Verified Status** (blue checkmark)

## Stats Dashboard

- **Total**: Tweets without authors
- **Processed**: Tweets attempted
- **Successful**: Author data extracted and saved
- **Failed**: Could not extract data

## Database Updates

### `creators` table
- Creates/updates creator record
- Sets `metadata.source = 'embed_scraper'`

### `content` table
- Links to creator via `author_id`
- Populates: `author_username`, `author_name`, `author_avatar_url`, `author_url`

## Performance

- **Speed**: ~4 seconds per tweet (3s load + 1s process)
- **Rate**: ~900 tweets/hour
- **Coverage**: Works for public tweets with embeds enabled

## Tips

- Let it run in auto mode overnight to process all ~15,000 tweets
- Check the console for detailed extraction logs
- Refresh the list after processing to see remaining count
- Failed tweets might be deleted or private - that's normal

## API Endpoints Used

- `GET /api/content/missing-authors` - Fetch unprocessed tweets
- `POST /api/content/update-author` - Save extracted data

## Troubleshooting

**"Could not extract author data"**
- Tweet may be deleted or protected
- Embed failed to load properly
- Try manual mode to inspect the embed

**Slow performance**
- Normal! Each embed needs time to fully render
- Don't reduce the 3-second wait time

**Auto mode stops**
- Check browser console for errors
- Refresh page and continue from where it stopped
