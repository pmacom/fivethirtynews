# Project Roadmap

**Version**: 1.0
**Last Updated**: 2025-10-10
**Purpose**: Strategic timeline from MVP to multi-platform expansion

---

## Vision

Transform social media from chaotic streams into structured, meaningful experiences through **community-curated tagging**. Enable users to collaboratively organize content with hierarchical tags, making discovery effortless and serendipitous.

---

## Guiding Principles

1. **User Empowerment**: Community controls the taxonomy, not algorithms
2. **Incremental Value**: Each phase delivers working software
3. **Documentation-Driven**: Code and docs stay synchronized
4. **Flexible Architecture**: Design for change from day one
5. **Free Forever**: No paywalls, no monetization pressure

---

## Phase 1: MVP - X.com Extension (Weeks 1-4)

### Goal
Prove the concept with a working Chrome extension for X.com (Twitter) that allows moderators to tag posts and view tagged content on a simple admin UI.

### Deliverables

#### Week 1: Foundation Setup
- [x] **Documentation**
  - System architecture overview
  - Database schema design
  - Development quickstart guide
  - Deployment guide for DigitalOcean
  - Tag hierarchy architecture
  - Branding configuration

- [ ] **Infrastructure**
  - Local Supabase instance running
  - Database schema applied with migrations
  - Seed data (10 sample tags)
  - Git repository initialized

#### Week 2: Chrome Extension Core
- [ ] **Extension Structure**
  - Manifest V3 configuration
  - TypeScript build pipeline (Vite)
  - Content script injection system
  - Background service worker

- [ ] **Twitter Adapter**
  - Detect X.com posts in DOM
  - Inject "530" button next to each post
  - MutationObserver for dynamic content
  - Extract post metadata (URL, ID, preview text)

- [ ] **Tag Selector UI**
  - Modal popup with tag hierarchy tree view
  - Create new tag with parent selection
  - Autocomplete for existing tags
  - Save tag association to database

#### Week 3: Authentication & API Integration
- [ ] **Supabase Auth**
  - Email/password login modal
  - JWT token storage in chrome.storage
  - Session management with auto-refresh

- [ ] **API Client**
  - Background worker API wrapper
  - Error handling and retry logic
  - IndexedDB caching for tag hierarchy
  - Real-time updates via WebSocket

- [ ] **RLS Policies**
  - Public read access
  - Authenticated write access
  - Role-based permissions (moderator vs admin)

#### Week 4: Admin UI & Testing
- [ ] **Next.js Admin Dashboard**
  - Homepage with recent tagged posts
  - Tag browser (tree view)
  - Post discovery page (filter by tag)
  - Simple login page

- [ ] **Testing**
  - Unit tests for Twitter adapter
  - E2E tests with Playwright (tag a post end-to-end)
  - Manual QA checklist

- [ ] **Polish**
  - Responsive design (mobile-friendly admin UI)
  - Loading states and error messages
  - Button styling consistency

### Success Criteria
- [ ] Extension injects button on 100% of X.com posts
- [ ] User can tag a post in <10 seconds
- [ ] Admin UI loads tag hierarchy in <2 seconds
- [ ] Zero crashes during 1-hour continuous use
- [ ] 5 moderators test and provide feedback

### Metrics to Track
- Tags created per day
- Posts tagged per day
- Average tags per post
- Tag hierarchy depth (should stay <5 levels)
- User retention (do moderators return?)

---

## Phase 2: Refinement & Discovery (Weeks 5-8)

### Goal
Improve UX based on MVP feedback and add features that encourage discovery and engagement.

### Deliverables

#### Enhanced Tag Management
- [ ] **Drag-and-Drop Reparenting**
  - Visual tree editor in admin UI
  - Real-time updates for all connected users
  - Undo/redo for accidental moves

- [ ] **Tag Merging**
  - Detect duplicate tags (e.g., "AI" vs "Artificial Intelligence")
  - Admin UI to merge tags (combines post associations)
  - Alias system for common variations

- [ ] **Bulk Operations**
  - Select multiple posts and tag at once
  - Import/export tag hierarchy (JSON)
  - Delete multiple tags with confirmation

#### Improved Discovery
- [ ] **Tag-Based Feeds**
  - "Latest in Technology" page
  - RSS feeds per tag
  - Email digest (weekly, tagged posts in your interests)

- [ ] **Search & Filters**
  - Full-text search across post content
  - Filter by platform, date range, tag
  - Sort by recency, popularity, or relevance

- [ ] **Related Tags**
  - "Users who tagged with X also tagged with Y"
  - Tag co-occurrence graph visualization
  - Suggested tags based on post content (ML model, optional)

#### Community Features
- [ ] **Tag Suggestions**
  - Users propose new tags or reparenting
  - Voting system (upvote/downvote)
  - Auto-approve after 5 upvotes

- [ ] **User Profiles**
  - View tags created by a user
  - Leaderboard (most tags created, most posts tagged)
  - Activity feed (recent actions)

#### Performance Optimization
- [ ] **Caching Layer**
  - Redis for frequently accessed tags
  - CDN for static admin UI assets (CloudFlare)
  - Database query optimization (EXPLAIN ANALYZE)

- [ ] **Background Jobs**
  - Async tag path updates (don't block UI)
  - Scheduled cleanup (delete orphaned tags)
  - Metrics aggregation (daily rollups)

### Success Criteria
- [ ] Tag discovery time reduced by 50% (user finds relevant content faster)
- [ ] 80% of users return weekly (engagement metric)
- [ ] Admin UI loads in <1 second (performance target)
- [ ] Zero downtime during deployments

---

## Phase 3: Multi-Platform Support (Weeks 9-16)

### Goal
Extend tagging to Reddit, TikTok, and other platforms, validating the platform adapter architecture.

### Platform Roadmap

#### Reddit Integration (Weeks 9-11)
- [ ] **Reddit Adapter**
  - Detect Reddit posts and comments
  - Inject "530" button in sidebar or toolbar
  - Extract post/comment data (URL, subreddit, author)

- [ ] **Subreddit-Specific Tags**
  - Filter tags by subreddit context
  - Auto-suggest tags based on subreddit (e.g., r/technology → "Technology" tag)

- [ ] **Testing**
  - Works on old.reddit.com and new.reddit.com
  - Handles nested comments
  - Respects Reddit's rate limits

#### TikTok Integration (Weeks 12-14)
- [ ] **TikTok Adapter**
  - Detect TikTok video posts (For You Page, profile pages)
  - Overlay "530" button on video UI
  - Extract video metadata (URL, creator, caption)

- [ ] **Video Preview**
  - Show video thumbnail in admin UI
  - Link directly to TikTok video

#### Instagram & YouTube (Weeks 15-16)
- [ ] **Instagram Adapter** (if feasible—Instagram's API is restrictive)
  - Tag posts and Reels
  - Handle Instagram's dynamic DOM

- [ ] **YouTube Adapter**
  - Tag videos and comments
  - Integration with YouTube search results

### Platform Abstraction Validation
- [ ] **Shared Components**
  - Reusable tag selector (works on all platforms)
  - Consistent button styling across platforms
  - Unified API client (same backend for all platforms)

- [ ] **Platform-Specific Settings**
  - Enable/disable tagging per platform
  - Platform-specific tag hierarchies (optional)
  - Custom button placement preferences

### Success Criteria
- [ ] At least 3 platforms supported (X.com, Reddit, TikTok)
- [ ] 90% code reuse across platforms (proves abstraction works)
- [ ] No regression in X.com functionality
- [ ] Cross-platform tag discovery (find posts from any platform under a tag)

---

## Phase 4: Advanced Features (Weeks 17-24)

### Goal
Add power-user features and scale to support larger communities (100+ moderators, 10k+ posts).

### Advanced Tag Features

#### Tag Relationships
- [ ] **Polyhierarchy**
  - Tags can have multiple parents
  - "Security" tag under both "Technology" and "Politics"
  - Graph-based visualization

- [ ] **Tag Metadata**
  - Descriptions for each tag (explain what belongs here)
  - External links (related Wikipedia pages, documentation)
  - Tag icons/emoji for visual identification

#### Content Quality
- [ ] **Post Ratings**
  - Upvote/downvote tagged posts
  - Quality score based on community votes
  - Hide low-quality posts (configurable threshold)

- [ ] **Moderation Queue**
  - Flag inappropriate tags or posts
  - Admin review queue
  - Auto-ban spam/bot accounts

#### Analytics & Insights
- [ ] **Tag Analytics Dashboard**
  - Growth trends (tags created over time)
  - Popular content (most-tagged posts)
  - User engagement metrics (active moderators, lurkers)

- [ ] **Export Tools**
  - Export tagged posts to CSV, JSON
  - API for third-party integrations
  - Webhook notifications (new tag, new post)

### Scalability

#### Database Optimization
- [ ] **Read Replicas**
  - Separate read/write database instances
  - Load balancing for queries

- [ ] **Partitioning**
  - Partition `posts` table by platform
  - Archive old posts (>1 year)

#### Infrastructure
- [ ] **Horizontal Scaling**
  - Multiple Supabase instances (sharding by region)
  - Load balancer (HAProxy or Nginx)
  - CDN for global latency reduction

- [ ] **Monitoring**
  - Prometheus + Grafana for metrics
  - Alerting for downtime or performance degradation
  - APM (Application Performance Monitoring)

### Success Criteria
- [ ] Support 1000+ concurrent users
- [ ] Handle 10k+ posts per day
- [ ] 99.9% uptime (max 43 minutes downtime per month)
- [ ] Sub-second API response times (p95)

---

## Future Explorations (Beyond Week 24)

### Mobile Apps
- [ ] React Native app for iOS/Android
  - Browse tagged content on mobile
  - Tag posts from mobile browsers (via share extension)

### Browser Extension for Other Browsers
- [ ] Firefox extension (WebExtensions API, mostly compatible)
- [ ] Safari extension (requires Swift conversion)

### Machine Learning
- [ ] Auto-suggest tags based on post content (NLP model)
- [ ] Detect trending topics (tag clusters over time)
- [ ] Personalized recommendations (show posts based on user's tag history)

### Federation & Decentralization
- [ ] ActivityPub support (integrate with Mastodon, Bluesky)
- [ ] Export user data (own your tags, take them with you)
- [ ] Self-hosted instances (let communities run their own 530 servers)

### Monetization (If Needed)
- [ ] Premium features for power users (advanced analytics, priority support)
- [ ] Sponsorships (ethical, transparent partnerships)
- [ ] Donations/Patreon for server costs

---

## Risk Management

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Platform API changes (X.com blocks extension) | Medium | High | Platform adapter abstraction, pivot to other platforms |
| Database performance bottleneck | Low | Medium | Early optimization, caching, read replicas |
| Security vulnerability (RLS bypass) | Low | High | Regular security audits, Supabase's built-in protections |
| Extension rejected by Chrome Web Store | Low | Medium | Sideloading option, distribute via GitHub |

### Product Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Low user adoption | Medium | High | Tight feedback loop with early users, iterate quickly |
| Tag hierarchy becomes messy | High | Medium | Admin tools for cleanup, merge/rename features |
| Spam/abuse (malicious tagging) | Medium | Medium | Moderation queue, rate limiting, user reputation system |
| Competition (similar tools launch) | Low | Low | Open source ethos, community-first approach |

---

## Decision Log

### Key Architectural Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-10-10 | Self-hosted Supabase on DigitalOcean | No third-party API dependencies, full control, cost-effective |
| 2025-10-10 | Email/password auth only (no OAuth) | Simplifies setup, avoids OAuth complexity for MVP |
| 2025-10-10 | Adjacency list + materialized path for hierarchy | Balance between write performance and query speed |
| 2025-10-10 | Public read, authenticated write | Encourages discovery while preventing anonymous spam |
| 2025-10-10 | Chrome extension over bookmarklet | Better UX, more powerful API access |

### Deferred Decisions

- Mobile app (wait until web extension proves value)
- Machine learning features (requires large dataset first)
- Monetization strategy (free forever until costs become unsustainable)

---

## Communication & Collaboration

### Weekly Sync
- **When**: Every Friday, 2 PM
- **Who**: Core contributors (moderators, developers)
- **Agenda**:
  1. Demo completed features
  2. Review metrics (tags created, posts tagged, user feedback)
  3. Plan next week's priorities
  4. Blockers and questions

### Async Updates
- **Slack/Discord**: Daily progress updates in #dev channel
- **GitHub Issues**: Feature requests, bugs, discussions
- **Documentation**: Update `/docs` with every sprint

---

## Success Definition

### MVP Success (Phase 1)
- ✅ Extension works reliably on X.com
- ✅ 10+ moderators actively tagging
- ✅ 100+ posts tagged with 50+ unique tags
- ✅ Admin UI stable and usable

### Long-Term Success (Phases 2-4)
- 🎯 1000+ users discover content via tags weekly
- 🎯 Tag hierarchy reflects community consensus (organic growth)
- 🎯 Multi-platform support (3+ platforms)
- 🎯 Self-sustaining community (moderators onboard others)

### Ultimate Vision
- 🌟 **Social media becomes navigable** like a well-organized library
- 🌟 **Communities form around tags** (discussions, meetups, collaborations)
- 🌟 **Open protocol** (other apps integrate 530 tags)

---

## Resources

### Team (Current)
- 1 developer (full-stack)
- 3-5 moderators (content curation, testing)

### Team (Desired for Phase 3+)
- 2 developers (1 frontend, 1 backend)
- 10+ moderators across platforms
- 1 designer (UI/UX polish)
- 1 community manager (onboarding, support)

### Budget
- **Hosting**: $12-24/month (DigitalOcean droplet)
- **Domain**: $15/year
- **Tools**: $0 (all open source)
- **Total**: ~$160-300/year

---

## Appendix: Alternative Approaches Considered

### Browser Bookmarklet (Rejected)
- **Pros**: No extension approval needed, works on all browsers
- **Cons**: Poor UX (manual clicks), limited DOM access, security concerns

### Third-Party API (e.g., Supabase Cloud) (Deferred)
- **Pros**: No server management, automatic backups
- **Cons**: Costs scale with users, less control, requires credit card

### Native Mobile App First (Rejected)
- **Pros**: Better mobile UX, app store distribution
- **Cons**: Longer development time, more complex than extension

### Blockchain-Based Tags (Rejected)
- **Pros**: Decentralized, immutable, trendy
- **Cons**: High complexity, gas fees, slow transactions, unnecessary for MVP

---

## Related Documentation

- `/docs/architecture/system-overview.md` - How components fit together
- `/docs/development/quickstart.md` - Start contributing today
- `/docs/deployment/digitalocean-setup.md` - Deploy to production
- `CLAUDE.md` - Guidance for future AI assistants working on this project

---

**Remember**: This roadmap is a living document. As we learn from users and experiment with ideas, priorities will shift. The goal is progress, not perfection.

**Next Step**: Start Phase 1, Week 1 tasks. Let's build! 🚀
