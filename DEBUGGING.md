# Debugging Guide - FiveThirty Viewer

This guide helps you identify, diagnose, and report issues when browsing content in the FiveThirty viewer application.

## Quick Start: How to Report Issues

When you encounter an issue (content not displaying, fitToBox failures, errors, etc.), follow these steps to gather useful debugging information:

### 1. Open Browser Developer Console

**Chrome/Edge:**
- Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
- Click the "Console" tab

**Firefox:**
- Press `F12` or `Cmd+Option+K` (Mac) / `Ctrl+Shift+K` (Windows)

**Safari:**
- Enable Developer Menu: Safari → Preferences → Advanced → Show Develop menu
- Press `Cmd+Option+C`

### 2. Filter Console Messages

Set console filter to show errors and warnings:
- Click the filter dropdown (usually shows "All levels")
- Enable: **Errors**, **Warnings**, **Verbose** (if needed)
- Disable: Info, Debug (reduces noise)

### 3. Reproduce the Issue

Navigate to the problematic content while console is open:
- Note which category you're in
- Note which item within that category
- Observe what happens (or doesn't happen)

### 4. Capture Essential Information

Copy the following information and share it:

```
**Issue Description:**
[Describe what you expected vs. what happened]

**Content Context:**
- Category: [e.g., "Tech News", "AI Updates"]
- Item position: [e.g., "3rd item in category"]
- Content type: [e.g., "Twitter video", "text-only tweet", "website"]

**Console Errors:**
[Copy/paste any red errors from console]

**Console Warnings:**
[Copy/paste any yellow warnings from console]

**Screenshot:**
[Attach screenshot showing the issue]
```

---

## Common Issues & How to Identify Them

### Issue 1: fitToBox Failures (Camera Not Framing Content)

**Symptoms:**
- Content appears but camera doesn't zoom/frame it properly
- Content is off-center or too far away
- Camera position doesn't update when navigating

**How to Identify:**
1. Open console
2. Look for error: `fitToBox failed - missing dependencies`
3. Check the logged object for details:
   ```javascript
   {
     hasCamera: true/false,
     hasActiveItemObject: true/false,
     activeItemId: "...",
     canvasSize: [width, height],
     isAnimating: true/false
   }
   ```

**What to Report:**
- The full error object from console
- Which content type caused it (video, tweet, image, etc.)
- Whether it happens consistently or randomly

**Common Causes:**
- Text-only content not setting activeItemObject ✅ **FIXED**
- Content loading during animation
- Error boundary fallback shown but not setting activeItemObject

---

### Issue 2: Content Load Failures (Gray Placeholder Shown)

**Symptoms:**
- Gray/blank placeholder appears instead of image/video
- Content shows loading indicator then fails
- Thumbnail missing

**How to Identify:**
1. Open console
2. Look for metric: `error_boundary_triggered`
3. Check for texture loading warnings
4. Check Network tab for failed requests

**What to Report:**
- Error message from `error_boundary_triggered` metric
- Failed URL (check Network tab)
- Content ID and type
- Whether it's consistent or intermittent

**Common Causes:**
- Invalid or expired image URLs
- CORS issues
- Network connectivity problems
- Missing thumbnail_url in database

---

### Issue 3: Text-Only Tweets Not Displaying

**Symptoms:**
- Tweet with only text doesn't show
- TextPlaneView not rendering
- Camera doesn't frame text card

**How to Identify:**
1. Open console
2. Look for warning: `Text-only tweet mentions pic.twitter.com - possible missing media`
3. Check if `activeItemObject` is set
4. Look for fitToBox errors

**What to Report:**
- Tweet ID (content_id)
- Tweet text (first 100 characters)
- Whether tweet should have media but it's missing
- Console errors/warnings

**Common Causes:**
- Twitter API didn't return media URLs
- Media expired or deleted
- Parsing error in tweet data

---

### Issue 4: Video Preload/Playback Issues

**Symptoms:**
- Video loading indicator stuck
- Video never starts playing
- Preload fails silently
- Choppy playback

**How to Identify:**
1. Enable verbose logging:
   ```bash
   # Add to .env.local
   NEXT_PUBLIC_VERBOSE_LOGGING=true
   ```
2. Restart dev server
3. Look for video preload logs:
   ```
   Video preload progress: {itemId} 50%
   Video ready to play: {itemId}
   Video preload error: {itemId} (attempt 1/2)
   ```

**What to Report:**
- Video URL (check console logs)
- Preload status and progress
- Network type (WiFi/cellular/desktop)
- Device type (mobile/desktop)
- Retry attempts logged

**Common Causes:**
- Video format not supported by browser
- Network bandwidth too low
- Video URL expired or invalid
- CORS issues

---

## Advanced Debugging

### Enable Verbose Logging

Create or edit `.env.local`:
```bash
NEXT_PUBLIC_VERBOSE_LOGGING=true
```

Restart the development server. This enables debug-level logging including:
- Video preload progress
- Navigation state changes
- Content loading details
- fitToBox calculations

### Inspect Current State

Open browser console and run:
```javascript
// Get current content state
useContentStore.getState()

// Check active item
const activeId = useContentStore.getState().activeItemId
const activeObject = useContentStore.getState().activeItemObject
console.log('Active:', activeId, activeObject)

// Check if video is ready
const itemId = 'your-item-id'
videoPreloadManager.isVideoReady(itemId)

// See all preloaded videos
videoPreloadManager.getAllPreloadedVideos()

// Get camera state
useSceneStore.getState()
```

### Check Network Requests

1. Open DevTools → Network tab
2. Filter by:
   - **XHR/Fetch** - API calls to Supabase
   - **Img** - Image/thumbnail loads
   - **Media** - Video loads

3. Look for:
   - Failed requests (red)
   - Slow requests (long duration)
   - CORS errors (in console)

### Examine React Three Fiber Scene

Install React DevTools extension, then:
1. Open DevTools → Components tab
2. Navigate to `<Canvas>` component
3. Expand to see:
   - Active PlaneView/TextPlaneView components
   - Three.js object hierarchy
   - Props and state

---

## Error Logging Reference

The application logs different types of messages:

### Error Levels

| Level | When Shown | Use Case |
|-------|-----------|----------|
| `logger.error()` | Always (even production) | Critical failures, bugs |
| `logger.warn()` | Development only | Potential issues, degraded functionality |
| `logger.log()` | Development only | General information |
| `logger.debug()` | Verbose mode only | Detailed debugging info |
| `logger.metric()` | Always (for analytics) | Telemetry, usage tracking |

### Key Error Messages

**fitToBox failed - missing dependencies**
- Critical: Camera can't frame content
- Check: `hasCamera`, `hasActiveItemObject` in logged object

**error_boundary_triggered**
- Critical: Component crashed during render
- Check: `error`, `stack`, `componentStack` in metric

**Video preload error**
- Warning: Video failed to load (with retry)
- Check: `itemId`, retry attempt number

**Text-only tweet mentions pic.twitter.com**
- Warning: Tweet should have media but doesn't
- Check: `contentId`, tweet text

---

## Content Validation

The app now validates content before rendering. To check if content is valid:

```javascript
import { validateAndLog } from '@/viewer/core/content/validation'

const item = useContentStore.getState().activeItemData
validateAndLog(item, 'manual_check')
```

This will log any validation errors or warnings to console.

---

## Reporting Template

Use this template when reporting issues:

```markdown
## Issue Report

**Environment:**
- Browser: [Chrome 120 / Firefox 115 / Safari 17]
- Device: [Desktop / Mobile / Tablet]
- OS: [macOS / Windows / iOS / Android]
- Network: [WiFi / Cellular / Ethernet]

**Issue Description:**
[Clear description of what went wrong]

**Expected Behavior:**
[What should have happened]

**Actual Behavior:**
[What actually happened]

**Steps to Reproduce:**
1. Navigate to [category name]
2. Select [item position or description]
3. Observe [specific issue]

**Content Details:**
- Content Type: [video / twitter / image / website]
- Item ID: [from console logs]
- Category: [category name]
- Item Position: [number in category]

**Console Output:**
```
[Paste relevant console errors/warnings]
```

**Screenshots:**
[Attach screenshots showing the issue]

**Additional Context:**
[Any other relevant information]
```

---

## Quick Diagnostic Checklist

When investigating an issue, check:

- [ ] Console has errors or warnings
- [ ] Network tab shows failed requests
- [ ] activeItemObject is set (`useContentStore.getState().activeItemObject`)
- [ ] camera is initialized (`useSceneStore.getState().camera`)
- [ ] Content type is valid (`validateAndLog(item)`)
- [ ] thumbnail_url or content_url exists
- [ ] Video preload status (if video content)
- [ ] React components rendered without errors
- [ ] Browser supports required features (WebGL, VideoTexture, etc.)

---

## Getting Help

With the information gathered using this guide:

1. Create a GitHub issue with the reporting template filled out
2. Share in the team chat with context and console logs
3. Include screenshots showing both the visual issue and console output

The more context you provide, the faster we can identify and fix the issue!
