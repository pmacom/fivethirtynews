# 530 Chrome Extension

A Chrome extension that adds collaborative tagging functionality to X.com (Twitter), allowing users to curate and organize social media content through a shared taxonomy system.

## Features

- **Multi-Platform Support**: Works on X.com (Twitter), YouTube, Reddit, and Bluesky
- **530 Button**: Adds a purple "530" button to every post with visual feedback
- **One-Click Tagging**: Tag posts instantly with hierarchical tag selection
- **Supabase Integration**: Persistent storage with shared community database
- **Enhanced Reddit Support**: Advanced detection for new Reddit (Shreddit) shadow DOM and old Reddit
- **Infinite Scroll Detection**: Automatically adds buttons to new posts as you scroll
- **Simple UI**: Clean popup showing recent tags and statistics

## Installation & Testing

### Step 1: Generate Icons

Before loading the extension, you need to generate the icon files:

1. Open `extension/public/icons/generate-icons.html` in your browser
2. Click "Download All Icons" button
3. Save the three PNG files (icon16.png, icon48.png, icon128.png) to the `extension/public/icons/` directory
4. Delete the `generate-icons.html` file after generating icons

### Step 2: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `extension/public` directory from this project
5. The 530 extension should now appear in your extensions list

### Step 3: Test on X.com

1. Navigate to [https://x.com](https://x.com) or [https://twitter.com](https://twitter.com)
2. Log in to your account
3. Scroll through your timeline - you should see purple "530" buttons on each post
4. Click a "530" button to tag a post
5. The button will show a checkmark (✓) to confirm the tag was saved
6. Click the extension icon (puzzle piece in toolbar) to view your tags

## Current Functionality

### Mock Mode (Default)

The extension starts in **mock mode**, which means:
- All tagged posts are stored locally in the browser
- Data persists during your session but may be cleared when the extension reloads
- No external database connection required
- Perfect for testing and development

### What Works

- ✅ Button injection on all X.com posts
- ✅ One-click tagging with visual feedback
- ✅ Popup UI showing tag count and recent tags
- ✅ Local storage of tagged posts
- ✅ Real-time statistics (total tags, today's tags)

### What's Coming Next

- 🔄 Supabase database integration for persistent storage
- 🔄 Tag hierarchy and categorization
- 🔄 User authentication
- 🔄 Shared community tagging
- 🔄 Advanced filtering and search

## Project Structure

```
extension/
├── public/
│   ├── manifest.json          # Extension configuration
│   ├── content.js             # Injects 530 button on X.com (Twitter)
│   ├── content-youtube.js     # YouTube integration
│   ├── content-reddit.js      # Reddit integration (new & old Reddit)
│   ├── content-bluesky.js     # Bluesky integration
│   ├── background.js          # Service worker for API calls
│   ├── tag-hierarchy-modal.js # Tag selection modal
│   ├── popup.html             # Extension popup UI
│   ├── popup.js               # Popup logic
│   ├── styles.css             # Button styling
│   └── icons/                 # Extension icons
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
└── README.md                  # This file
```

## Platform-Specific Features

### Reddit Integration
The Reddit content script includes advanced features:
- **Shadow DOM Support**: Works with new Reddit's web component architecture
- **Multi-Strategy Detection**: 5 different methods to extract post IDs
- **Infinite Scroll Handling**: Automatically detects new posts as you scroll
- **SPA Navigation Detection**: Detects URL changes without page reload
- **Old Reddit Support**: Works with classic Reddit layout (.thing.link elements)
- **Fallback Container**: Creates custom action button container if native one not found
- **High-Quality Media Extraction**:
  - Automatically converts preview.redd.it URLs to i.redd.it for full resolution
  - Removes quality-limiting query parameters
  - Extracts all images from gallery posts
  - Captures video elements with dimensions and duration
  - Supports v.redd.it hosted videos
  - Detects MIME types (JPEG, PNG, GIF, WebP, MP4, WebM)
- **Complete Author Metadata**:
  - Extracts username, display name, and profile URL
  - Captures author avatars when available
  - Properly formats all author URLs
- **Rich Post Metadata**:
  - Subreddit information
  - Post scores and comment counts
  - Content type detection (video vs image vs text)

### YouTube Integration
- Detects video posts with thumbnail extraction
- Captures video metadata (duration, title, channel)
- Works with YouTube's dynamic content loading

### X.com (Twitter) Integration
- Fast button injection on timeline posts
- Quote tweets and retweets supported
- Media gallery support

### Bluesky Integration
- Native Bluesky post detection
- Author and content extraction

## Troubleshooting

### Extension doesn't load
- Make sure you selected the `extension/public` directory, not the root or `extension` directory
- Check that all icon files (icon16.png, icon48.png, icon128.png) are present in `icons/`
- Look for errors in Chrome DevTools console

### Buttons don't appear on websites
- Refresh the page after loading the extension
- Check browser console (F12) for "530 Extension: [Platform] content script loaded" message
- Verify you're on a supported platform (X.com, YouTube, Reddit, Bluesky)
- For Reddit: Extension works with both old.reddit.com and www.reddit.com (new Reddit with shadow DOM)
- For Reddit: Wait a few seconds for posts to be detected, especially on infinite scroll

### Tags don't persist
- This is expected in mock mode - tags are stored in memory
- To enable persistent storage, connect to Supabase (instructions coming soon)

### Popup shows "0 tags" after tagging
- Click the extension icon again to refresh
- Check browser console for error messages

## Development

### Debugging

1. **Content Script**: Right-click on X.com page → Inspect → Console tab
2. **Background Script**: Go to `chrome://extensions/` → Click "service worker" link under 530 extension
3. **Popup**: Right-click extension icon → Inspect popup

### Making Changes

After modifying any files:
1. Go to `chrome://extensions/`
2. Click the refresh icon (⟳) on the 530 extension card
3. Reload any platform tabs (X.com, Reddit, YouTube, Bluesky) to see changes

### Testing Reddit Integration

To test the enhanced Reddit features:
1. Visit https://www.reddit.com (new Reddit) or https://old.reddit.com
2. Open browser console (F12) to see debug logs
3. Look for "530: Found X Reddit posts to process" messages
4. Scroll down to test infinite scroll detection
5. Navigate to different subreddits to test SPA navigation
6. Verify buttons appear in the action row below each post

## Next Steps

1. **Test the Extension**: Follow installation steps above
2. **Generate Test Data**: Tag 5-10 posts on X.com to populate the popup
3. **Review Functionality**: Verify buttons inject correctly and tagging works
4. **Connect Supabase**: Once testing is complete, we'll integrate the database

## Support

If you encounter issues:
- Check the browser console for error messages
- Verify all files are in the correct locations
- Try reloading the extension and refreshing X.com

---

**Project**: 530 - Social Media Curator
**Version**: 0.2.0 (Multi-Platform)
**Platforms**: X.com (Twitter), YouTube, Reddit, Bluesky
