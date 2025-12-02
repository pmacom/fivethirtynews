# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**530 Project**: A community-curated social media content tagging platform starting with a Chrome extension for X.com (Twitter). Users collaboratively tag and organize content using a "530" button, creating a shared hierarchical taxonomy that evolves with community input.

**Core Philosophy**: Empower users to transform social media from chaotic streams into structured, meaningful experiences through collaborative organization.

## Technology Stack

- **Frontend**: JavaScript/TypeScript with Chrome Extension APIs
- **Admin UI**: Next.js (planned)
- **Backend**: Supabase (database and API)
- **Target Platform (MVP)**: X.com (Twitter)
- **Future**: Multi-platform extensibility

## Architecture Principles

### 1. Documentation-Driven Development
- All documentation lives in `/docs` as modular, versioned markdown files
- Documentation captures business objectives, philosophical principles, development approaches, and code-architecture relationships
- **Critical**: Code changes MUST be synchronized with documentation updates
- Update `/docs` with every sprint to reflect current project state
- Review PRIMARY_DIRECTIVE.md before making architectural decisions

### 2. Modularity and Reusability
- Design components for reuse across multiple platforms
- Keep business logic (e.g., button injection, tagging) separate from platform-specific code
- Plan for extensibility beyond X.com from the start

### 3. Community-First Design
- Tags are stored in a shared database accessible to all users
- Hierarchy evolves organically based on community input
- UI should facilitate discovery and connection between users

### 4. AI Orchestrator Constraints
- **Single-task execution**: Complete one file operation at a time to avoid concurrency issues
- Always confirm task completion (e.g., "File written successfully") before proceeding
- Report errors clearly with actionable suggestions

## Development Workflow

### Before Starting Any Task
1. Read PRIMARY_DIRECTIVE.md in `/docs` to understand project philosophy
2. Check `/docs` for relevant documentation about the feature/area you're modifying
3. Store important decisions using `ken-you-remember` to maintain context

### Making Changes
1. **Read** existing code and documentation first
2. **Verify** changes align with PRIMARY_DIRECTIVE.md principles
3. **Update** relevant documentation in `/docs` alongside code changes
4. **Test** changes thoroughly
5. **Store** decisions and learnings in memory

### Documentation Updates
- Use lightweight review processes (e.g., checklists in pull requests)
- Validate modifications with stakeholders if they conflict with stated goals
- Keep documentation modular and focused on "why" not just "what"

## Chrome Extension Architecture (MVP)

### Key Components
1. **Content Script**: Injects "530" button into X.com posts
2. **Background Service**: Manages API calls to Supabase
3. **Popup/Options**: User interface for tag management and settings
4. **Tag Hierarchy System**: Stores and retrieves hierarchical categories

### Data Flow
```
User clicks "530" button → Content script captures post context →
Background service sends to Supabase → Tag saved with hierarchy →
Tag appears in shared database for all users
```

## Stack Evolution Strategy

- Conduct periodic reviews (quarterly recommended) to adapt tools
- Prioritize modularity when refactoring
- Use metrics (tag adoption, tech debt) to guide improvements
- Maintain living roadmap in `/docs` balancing MVPs with long-term goals

## Critical Reminders

### Security
- Never commit API keys, tokens, or credentials
- Validate all user input before storing in database
- Use Supabase Row Level Security (RLS) for access control

### Communication
- Align changes with project managers through clear channels
- Document outcomes of architectural discussions in `/docs`
- Test ideas with small-scale prototypes when possible

### Long-term Adaptability
- Design for shifts in scope, team size, and technology trends
- Keep code loosely coupled to enable platform expansion
- Balance immediate deliverables with extensibility

## Success Criteria for Changes

Before considering any task complete:
- [ ] Code works without errors
- [ ] Documentation in `/docs` is updated to reflect changes
- [ ] Changes align with PRIMARY_DIRECTIVE.md principles
- [ ] Solution is stored in memory for future reference
- [ ] Changes are modular and don't create tight coupling

---

*Remember: This project's heart is empowering community collaboration and structured content discovery. Every change should advance that mission.*
- # Error Type
Runtime TypeError

## Error Message
get.content is not a function


    at setInitialActive (wtf/Content/contentStore.ts:87:25)
    at WTF.useEffect (wtf/WTF.tsx:60:18)
    at EpisodePage (app/episodes/[date]/page.tsx:143:7)

## Code Frame
  85 |    */
  86 |   setInitialActive: (categoryId?: string, itemId?: string) => {
> 87 |     const content = get.content();
     |                         ^
  88 |     if (!content || content.length === 0) return;
  89 |
  90 |     // If no categoryId provided, use first category

Next.js version: 15.5.4 (Turbopack)