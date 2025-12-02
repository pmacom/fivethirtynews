# Social Media Embed Libraries for React (2025)

_Generated: 2025-10-19 | Sources: 5 web searches across npm, GitHub, and technical blogs_

## Quick Reference

**Key Findings:**
- **Twitter/X**: Use `react-tweet` (Vercel) - best performance, no API keys needed
- **YouTube**: Use `react-lite-youtube-embed` - 224x faster, privacy-focused
- **Reddit**: Use `reddit-embed` - no API keys, CDN-based
- **Bluesky**: Use `react-bluesky-embed` - RSC support, full theme customization
- **Multi-platform**: Use `react-social-media-embed` - 7 platforms in one package

---

## 1. Twitter/X Embeds

### Recommended: react-tweet (Vercel)

**NPM Package:** `react-tweet`
**Latest Version:** 3.2.2 (published ~7 months ago, March 2024)
**Maintenance Status:** Healthy (Vercel-maintained)

#### Installation
```bash
npm install react-tweet
```

#### Basic Usage
```jsx
import { Tweet } from 'react-tweet'

export default function Page() {
  return <Tweet id="1628832338187636740" />
}
```

#### Pros
- **No API keys required** - Reverse-engineers Twitter's Embed API
- **Superior performance** - Eliminates 560kb of iframe JavaScript
- **Static rendering** - Can render tweets at build time
- **No layout shift** - Prevents cumulative layout shift issues
- **Active maintenance** - Backed by Vercel
- **104 dependent projects** - Moderate adoption
- **364 GitHub stars** - Growing community

#### Cons
- Rate limiting possible (mitigate with Redis/Vercel KV caching)
- Not official Twitter/X library
- Relies on reverse-engineered API (could break with Twitter changes)

#### Performance Considerations
- Traditional embedded iframes load **560kb** of client-side JavaScript
- `react-tweet` eliminates iframes entirely, dramatically improving Core Web Vitals
- Recommendation: Use Redis or Vercel KV to cache tweets and prevent rate limiting

---

### Alternative: react-twitter-embed

**NPM Package:** `react-twitter-embed`
**Latest Version:** 4.0.4 (last published 4 years ago)
**Maintenance Status:** Inactive/Deprecated

#### Installation
```bash
npm install react-twitter-embed
```

#### Basic Usage
```jsx
import { TwitterTweetEmbed } from 'react-twitter-embed'

<TwitterTweetEmbed tweetId="1628832338187636740" />
```

#### Pros
- Simple API
- 53 projects using it

#### Cons
- **Last updated 4 years ago** (not maintained)
- Uses official Twitter widgets (slower performance)
- Loads full iframe overhead
- Not recommended for 2025 projects

---

## 2. YouTube Embeds

### Recommended: react-lite-youtube-embed

**NPM Package:** `react-lite-youtube-embed`
**Latest Version:** 2.5.6 (published 2 months ago, August 2025)
**Maintenance Status:** Actively maintained

#### Installation
```bash
npm install react-lite-youtube-embed
```

#### Basic Usage
```jsx
import LiteYouTubeEmbed from 'react-lite-youtube-embed'
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css'

export default function VideoPage() {
  return (
    <LiteYouTubeEmbed
      id="dQw4w9WgXcQ"
      title="Video Title"
    />
  )
}
```

#### Pros
- **~224x faster** than standard YouTube embeds (based on original lite-youtube-embed)
- **Privacy-first** - Since v2.0.0, uses `youtube-nocookie.com` by default
- **No ad network preconnection** - Doesn't connect to Google ad network
- **Tiny package size** - 1.4kB minified, 699B gzipped
- **0 dependencies**
- **62 dependent packages** - Good adoption
- **127 versions** - Well-maintained with frequent updates
- Must explicitly import CSS file for styling

#### Cons
- Requires manual CSS import
- React port doesn't achieve exact 224x performance of web component version
- Needs user interaction to load full player (by design for performance)

#### Performance Considerations
- Defers YouTube iframe load until user clicks play button
- Dramatically reduces initial page load time
- Uses static thumbnail image instead of full YouTube embed
- Perfect for pages with multiple video embeds

---

### Alternative: react-youtube

**NPM Package:** `react-youtube`
**Latest Version:** 10.1.0 (last published 3 years ago)
**Maintenance Status:** Inactive/Stale

#### Installation
```bash
npm install react-youtube
```

#### Basic Usage
```jsx
import YouTube from 'react-youtube'

const opts = {
  height: '390',
  width: '640',
  playerVars: {
    autoplay: 1,
  },
}

<YouTube videoId="dQw4w9WgXcQ" opts={opts} />
```

#### Pros
- **Full YouTube API control** - Thin wrapper over YouTube Player API
- **286 projects using it** - Popular choice historically
- Rich API for player controls (play, pause, seek, etc.)

#### Cons
- **Last updated 3 years ago** (2022)
- No performance optimizations
- Loads full YouTube iframe immediately
- Not recommended for 2025 projects due to lack of updates

---

## 3. Reddit Embeds

### Recommended: reddit-embed

**NPM Package:** `reddit-embed`
**Maintenance Status:** Active (based on npm listing)

#### Installation
```bash
npm install reddit-embed
```

#### Basic Usage
```jsx
// In React component
import { useEffect } from 'react'

function RedditPost() {
  useEffect(() => {
    // Load Reddit embed script
    const script = document.createElement('script')
    script.src = 'https://embed.reddit.com/widgets.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  return (
    <blockquote className="reddit-card">
      <a href="https://www.reddit.com/r/reactjs/comments/example">
        Reddit Post Title
      </a>
    </blockquote>
  )
}
```

#### Pros
- **No API key required** - Works through CDN
- **Easily customizable** - JavaScript plugin
- Official Reddit embed support
- Works with native Reddit embed code

#### Cons
- Dark mode by default (can conflict with light-themed sites)
- Font color issues when using dark theme
- Height issues with iframes (may need manual adjustment)
- Less React-specific than other solutions
- Limited React component abstraction

#### Performance Considerations
- Loads Reddit's external script (additional HTTP request)
- Uses iframes (can impact performance)
- Height: auto can cause rendering issues (uncheck in dev tools)

---

### Alternative: Native Reddit Embed Code

You can use Reddit's native embed functionality:

1. Click "embed" button under any Reddit comment/post
2. Copy the provided HTML code
3. Paste into React component's render function
4. Move script to `componentDidMount` or `useEffect`

```jsx
<blockquote className="reddit-card">
  <a href="https://www.reddit.com/r/reactjs/comments/example">
    Post Title
  </a>
</blockquote>
<script async src="https://embed.reddit.com/widgets.js"></script>
```

---

## 4. Bluesky Embeds

### Recommended: react-bluesky-embed

**NPM Package:** `react-bluesky-embed`
**Maintenance Status:** Actively maintained (2025)

#### Installation
```bash
npm install react-bluesky-embed
```

#### Basic Usage
```jsx
import { BlueskyPost } from 'react-bluesky-embed'

export default function PostPage() {
  return (
    <BlueskyPost
      postUrl="https://bsky.app/profile/user.bsky.social/post/abc123"
      theme="light"
    />
  )
}
```

#### Pros
- **React Server Component (RSC) support** - Works with Next.js App Router
- **Light and dark themes** - Built-in theme switching
- **Thread depth configuration** - Control how many replies to display
- **Multiple embed types** - Posts, profiles, and feeds
- **Active development** - New platform, active community
- Works with Next.js, Vite, and Create React App

#### Cons
- **Rate limiting possible** - Recommend using Redis/Vercel KV for caching
- Newer platform (smaller community than Twitter)
- API may change as Bluesky evolves
- Multiple competing libraries (ecosystem fragmentation)

#### Performance Considerations
- Supports server-side rendering for better performance
- Can fetch data during SSR using raw API
- Caching strongly recommended to avoid rate limits

---

### Alternative Options

#### bsky-react-post (rhinobase/react-bluesky)

**NPM Package:** `@rhinobase/bsky-react-post`

```bash
npm install @rhinobase/bsky-react-post
```

Similar features to react-bluesky-embed, with documentation at bsky-react-post.rhinobase.io

---

#### bluesky-embed-react

**NPM Package:** `bluesky-embed-react`

```bash
npm install bluesky-embed-react
```

**Features:**
- Lightweight and configurable
- Supports posts, profiles, and feeds
- Raw API access for SSR
- Theme customization

---

#### @hamstack/bluesky-embed-rsc

**NPM Package:** `@hamstack/bluesky-embed-rsc`

```bash
npm install @hamstack/bluesky-embed-rsc
```

**Features:**
- Specialized for Next.js with React Server Components
- Graceful fallbacks
- Server-side rendering focused

---

#### Bluesky Comments Component

**Use Case:** Embedding comment threads from Bluesky

**Features:**
- Works as React component or via CDN
- Built-in spam/low-quality comment filters
- Comment thread embedding

---

## 5. Multi-Platform Solutions

### Recommended: react-social-media-embed

**NPM Package:** `react-social-media-embed`
**Latest Version:** 2.5.18
**Maintenance Status:** Actively maintained

#### Supported Platforms
- Facebook
- Instagram
- LinkedIn
- Pinterest
- TikTok
- X (Twitter)
- YouTube

#### Installation
```bash
npm install react-social-media-embed
```

#### Basic Usage
```jsx
import {
  FacebookEmbed,
  InstagramEmbed,
  LinkedInEmbed,
  PinterestEmbed,
  TikTokEmbed,
  XEmbed,
  YouTubeEmbed
} from 'react-social-media-embed'

export default function SocialFeed() {
  return (
    <div>
      <XEmbed url="https://twitter.com/user/status/123" width={325} />
      <YouTubeEmbed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" width={325} height={220} />
      <InstagramEmbed url="https://www.instagram.com/p/ABC123/" width={328} />
    </div>
  )
}
```

#### Pros
- **No API tokens required** - Just needs URLs
- **7 platforms in one package** - Unified interface
- **Automatic retry logic** - Retries failed embeds with configurable delay
- **Placeholder support** - Show loading states
- **TypeScript support** - Full type definitions
- **All div props supported** - Easy customization
- **Massive adoption** - 3.4M+ total downloads, 187K downloads/month
- **Active maintenance** - Regular updates

#### Cons
- Larger bundle size than specialized libraries
- May load unnecessary code for platforms you don't use
- Uses each platform's official embed (inherits their performance characteristics)
- Not optimized like lite-youtube-embed or react-tweet

#### Performance Considerations
- Bundle size increases with number of platforms used
- Consider tree-shaking to remove unused platform embeds
- Official embeds may be slower than optimized alternatives (react-tweet, lite-youtube)
- Good for multi-platform needs, but specialized libraries often perform better

#### Download Statistics (as of 2025)
- **Total Downloads:** 3,466,053
- **Last Day:** 1,742
- **Last Week:** 48,054
- **Last Month:** 187,261
- **Last Year:** 2,037,384

---

### Alternative: ReactPlayer (Video-Focused)

**NPM Package:** `react-player`

For video-specific embeds across multiple platforms:
- YouTube
- Facebook
- Twitch
- SoundCloud
- Streamable
- Vimeo
- Wistia
- Mixcloud
- DailyMotion

**Installation:**
```bash
npm install react-player
```

**Features:**
- Unified video player API
- Custom controls
- Playback events
- Better for media-heavy applications

---

## Comparison Matrix

| Platform | Best Library | Version | Last Updated | Bundle Size | API Key? | Active? |
|----------|-------------|---------|--------------|-------------|----------|---------|
| **Twitter/X** | react-tweet | 3.2.2 | ~7 mo ago | Small | No | Yes |
| **YouTube** | react-lite-youtube-embed | 2.5.6 | 2 mo ago | 1.4kB (699B gz) | No | Yes |
| **Reddit** | reddit-embed | N/A | Active | N/A | No | Yes |
| **Bluesky** | react-bluesky-embed | Latest | 2025 | N/A | No | Yes |
| **Multi-platform** | react-social-media-embed | 2.5.18 | Active | Larger | No | Yes |

---

## Recommendations by Use Case

### Performance-Critical Applications
- **Twitter/X:** `react-tweet` (eliminates 560kb iframe)
- **YouTube:** `react-lite-youtube-embed` (224x faster)
- Use specialized libraries over multi-platform solutions

### Multi-Platform Needs
- **Best Choice:** `react-social-media-embed`
- Unified API across 7 platforms
- Good for content aggregation sites, social feeds

### Privacy-Focused Applications
- **YouTube:** `react-lite-youtube-embed` (uses youtube-nocookie.com)
- **Twitter/X:** `react-tweet` (no ad network preconnection)
- Avoid official embeds that track users

### Next.js / SSR Applications
- **Twitter/X:** `react-tweet` (static rendering support)
- **Bluesky:** `react-bluesky-embed` (RSC support)
- **YouTube:** `react-lite-youtube-embed` (works with SSR)

### Rapid Prototyping
- **Best Choice:** `react-social-media-embed`
- Quick setup, no configuration needed
- Just paste URLs and go

---

## Important Considerations

### Rate Limiting
**Affected Libraries:**
- `react-tweet` (Twitter/X)
- `react-bluesky-embed` (Bluesky)

**Solutions:**
- Use Redis or Vercel KV for caching
- Implement request throttling
- Cache API responses at build time (SSG)

---

### Bundle Size Impact

**Minimal Impact (< 2kB):**
- `react-lite-youtube-embed` (1.4kB)
- `react-tweet` (small)

**Medium Impact:**
- Individual platform libraries (~5-20kB)

**Larger Impact:**
- `react-social-media-embed` (includes 7 platforms)
- Use tree-shaking to minimize

---

### Browser Compatibility
All libraries support modern browsers (Chrome, Firefox, Safari, Edge)
- Most require ES6+
- Check specific library docs for IE11 support (generally not supported in 2025)

---

### Accessibility
**Best Practices:**
- Use semantic HTML where possible
- Provide alt text for video thumbnails
- Ensure keyboard navigation works
- Test with screen readers

**Libraries with Good A11y:**
- `react-lite-youtube-embed` (semantic HTML structure)
- `react-tweet` (preserves Twitter's accessibility features)

---

### Security Considerations
**All Embed Libraries:**
- Third-party content can contain arbitrary JavaScript
- Iframes provide some isolation but not complete security
- CSP (Content Security Policy) may need adjustment
- Consider sandboxed iframes for untrusted content

**Privacy:**
- Official embeds may track users (cookies, analytics)
- Lite/privacy-enhanced versions recommended (youtube-nocookie, etc.)

---

## Migration Guide

### From react-twitter-embed to react-tweet
```jsx
// OLD (react-twitter-embed)
import { TwitterTweetEmbed } from 'react-twitter-embed'
<TwitterTweetEmbed tweetId="1234" />

// NEW (react-tweet)
import { Tweet } from 'react-tweet'
<Tweet id="1234" />
```

### From react-youtube to react-lite-youtube-embed
```jsx
// OLD (react-youtube)
import YouTube from 'react-youtube'
<YouTube videoId="abc123" />

// NEW (react-lite-youtube-embed)
import LiteYouTubeEmbed from 'react-lite-youtube-embed'
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css'
<LiteYouTubeEmbed id="abc123" title="Video" />
```

---

## Resources

### Official Documentation
- [react-tweet docs](https://react-tweet.vercel.app/) - Twitter/X embeds
- [react-lite-youtube-embed GitHub](https://github.com/ibrahimcesar/react-lite-youtube-embed) - YouTube embeds
- [react-bluesky-embed docs](https://react-bluesky-embed.vercel.app/) - Bluesky embeds
- [react-social-media-embed GitHub](https://github.com/justinmahar/react-social-media-embed) - Multi-platform

### Related Articles
- [Vercel: Introducing React Tweet](https://vercel.com/blog/introducing-react-tweet) - Official announcement
- [Faster YouTube embeds with React Lite YouTube](https://dev.to/ibrahimcesar/faster-youtube-embeds-with-react-lite-youtube-embed-component-for-react-my-first-open-source-project-1ao2) - Performance deep dive

### NPM Packages
- [react-tweet on npm](https://www.npmjs.com/package/react-tweet)
- [react-lite-youtube-embed on npm](https://www.npmjs.com/package/react-lite-youtube-embed)
- [reddit-embed on npm](https://www.npmjs.com/package/reddit-embed)
- [react-bluesky-embed on npm](https://www.npmjs.com/package/react-bluesky-embed)
- [react-social-media-embed on npm](https://www.npmjs.com/package/react-social-media-embed)

---

## Metadata

```yaml
research-date: 2025-10-19
confidence: high
sources-checked: 5
platforms-covered: 5 (Twitter/X, YouTube, Reddit, Bluesky, Multi-platform)
libraries-evaluated: 12
active-libraries: 8
deprecated-libraries: 2
version-accuracy: Current as of October 2025
```

---

## Quick Decision Tree

```
Need to embed social media in React?
│
├─ Single platform?
│  ├─ Twitter/X? → react-tweet
│  ├─ YouTube? → react-lite-youtube-embed
│  ├─ Reddit? → reddit-embed
│  └─ Bluesky? → react-bluesky-embed
│
├─ Multiple platforms? → react-social-media-embed
│
├─ Performance critical? → Use specialized libraries (react-tweet, lite-youtube)
│
├─ Privacy focused? → lite-youtube-embed + react-tweet
│
└─ Rapid prototype? → react-social-media-embed
```

---

**Last Updated:** 2025-10-19
**Next Review:** Check for library updates quarterly
**Status:** Current and actively maintained recommendations
