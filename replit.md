# ContentLayerOS

## Overview

ContentLayerOS is a context-aware content operating system for founders with two distribution modes: LinkedIn and 𝕏 (Twitter). The system transforms raw weekly materials (voice notes, call transcripts, build notes, reflections) into high-quality post drafts. This is a thinking and drafting system with human-in-the-loop design—no auto-posting.

Key capabilities:
- **LinkedIn Mode**: Weekly content generation for 4 post types (Educational Authority, Founder Story, Trend Translation, System Principle) + 3 LinkedIn Carousels
- **LinkedIn Carousel Mode**: Generate 3 carousel drafts with distinct themes (Step-by-Step Framework, Myth vs Reality, Lessons from Experience) - each with 7 slides (hook, 5 content, CTA)
- **"Be Contrary" mode** (LinkedIn): Generate thoughtful contrarian responses to popular narratives with 4 distinct angles
- **𝕏 Mode**: Generate 1 newsletter section (300-500 words) + 3 Twitter posts (≤280 chars)
- **Raw Tweet Mode** (𝕏): Generate 5-7 single tweets with variety across five types: POV Statement, Contrarian Reframe, Operator Reality, System Rule, Quiet Insight
- Context management (ICP, positioning, language rules, visual references)
- Feedback learning system for performance tracking
- Google Sheets export integration

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode)
- **Build Tool**: Vite with path aliases (@/, @shared/, @assets/)

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful JSON API under /api/* routes
- **AI Integration**: OpenAI API via Replit AI Integrations for content generation

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: shared/schema.ts (shared between client/server)
- **Validation**: Zod schemas with drizzle-zod integration
- **Storage**: In-memory storage (MemStorage) with interface for database migration

### Core Data Models
- **ContextItems**: Reusable context pieces (ICP, positioning, language rules, visual)
- **WeeklyRuns**: Individual content generation sessions
- **PostDrafts**: Generated LinkedIn posts with status tracking
- **FeedbackEntries**: Performance tracking for learning

### Content Generation Pipeline

**LinkedIn Regular Mode:**
1. Raw input + selected context items → Signal extraction (OpenAI)
2. Extracted signals → 4 post drafts (one per post type) + 3 carousel drafts
3. Pattern extraction from feedback for future improvements

**LinkedIn Carousel Generation:**
1. Uses same extracted signals as regular posts
2. Generates 3 carousels with distinct themes:
   - **Step-by-Step Framework**: Practical numbered guide walking through a process
   - **Myth vs Reality**: Challenges misconceptions with operator-grounded truth
   - **Lessons from Experience**: First-person insights from building/operating
3. Each carousel has 7 slides: hook slide, 5 content slides, CTA slide
4. Each slide contains headline (4-10 words) + body text (1-3 sentences)

**Authority Article Mode (LinkedIn):**
1. Raw input + optional angle + selected context items → Signal extraction (OpenAI)
2. Generate ONE long-form article (800–1500 words) with 8-part structure:
   - Hook (contrarian, 1–2 sentences)
   - The Problem (operator pain)
   - What People Think Is Happening
   - What's Actually Happening
   - Core Insight / Framework (mandatory named concept e.g. "Coordination Debt")
   - Real Example or Scenario
   - Implication
   - Closing Shift
3. Article stored as a single draft with: title (in hook field), full article body, named concept (coreInsight)
4. Intended as the primary source for all downstream content (LinkedIn posts, carousels, X content, SEO)
5. Optional "Article Angle" input to focus the direction/framing
6. Mutually exclusive with "Be Contrary" mode

**LinkedIn "Be Contrary" Mode:**
1. External signal (viral post, article, narrative) + optional framing note
2. Generate 4 contrarian posts with distinct angles:
   - **Calm Reframe**: Educated disagreement; popular view is understandable but incomplete
   - **Operator Reality**: Ground theory in execution; what's true online breaks in real work
   - **Systems View**: Elevate above discourse; the problem isn't the tool, it's the system
   - **Consequence View**: Practical caution; if you follow this advice, here's what breaks
3. Tone rules: calm (not combative), thoughtful disagreement, never name original author, no outrage language

**𝕏 Standard Mode:**
1. Raw input + selected context items → Signal extraction (OpenAI)
2. Generate 1 newsletter section (300-500 words) + 3 Twitter posts (≤280 chars)
3. Newsletter uses paradox/open loop structure; posts compress ideas

**𝕏 Raw Tweet Mode:**
1. Raw input + selected context items → Signal extraction (OpenAI)
2. Generate 5-7 single tweets with variety across five types:
   - **POV Statement**: Declarative belief, no preamble
   - **Contrarian Reframe**: Flip conventional take
   - **Operator Reality**: Insider truth that sounds unpopular
   - **System Rule**: Mental model or constraint
   - **Quiet Insight**: Reflective observation
3. Constraints: ≤280 chars, no emojis, no hashtags, no thread language, operator tone

**Phoenix Algorithm Optimization (𝕏 Only):**
All 𝕏 content is optimized for the Phoenix algorithm with:
- **Reply-inviting endings**: Natural closings that prompt operator replies (not engagement bait like "thoughts?")
- **Dwell-time formatting**: Strategic line breaks and short paragraphs to slow readers down
- **Platform retention**: No external links, hashtags, or emojis (keeps readers on platform)
- **Fatigue detection**: API endpoint to check semantic similarity against recent approved posts
- **Phoenix metadata**: Each draft includes replyLikelihood, dwellLikelihood, fatigueRisk, and authorEngagementReminder

### Project Structure
```
client/src/        - React frontend application
  pages/           - Route components (Dashboard, Context, Drafts, Feedback)
  components/      - Reusable UI components
  lib/             - Utilities and providers
server/            - Express backend
  lib/             - Business logic (contentGenerator, googleSheets)
  replit_integrations/ - AI/audio/chat utilities
shared/            - Shared types and schemas
```

## External Dependencies

### AI Services
- **OpenAI API**: Content generation via Replit AI Integrations
  - Environment: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`
  - Used for signal extraction and post generation

### Database
- **PostgreSQL**: Primary database (via DATABASE_URL environment variable)
- **Drizzle Kit**: Schema migrations with `npm run db:push`

### External Integrations
- **Google Sheets API**: Export generated posts to spreadsheets
  - Uses Replit Connectors for OAuth authentication
  - Connection name: `conn_google-sheet`

### Key NPM Dependencies
- `@tanstack/react-query`: Server state management
- `drizzle-orm` / `drizzle-zod`: Database ORM and validation
- `openai`: AI API client
- `googleapis`: Google Sheets integration
- `wouter`: Client-side routing
- `zod`: Runtime type validation