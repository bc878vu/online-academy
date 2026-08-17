# Social Automation MVP

## Goal
Build a compliant automation platform that turns a topic into ready-to-publish content and schedules publishing through official platform APIs.

## Platforms
- YouTube
- Instagram
- Facebook Pages

## MVP flow
1. User creates a workspace and selects a niche.
2. AI generates content ideas and scripts.
3. Content pipeline creates metadata, captions and publishing assets.
4. User reviews or enables auto-approval rules.
5. Scheduler queues content.
6. Official OAuth/API integrations publish to connected accounts.
7. Analytics are collected and used to improve future content.

## Safety/compliance
- Use official OAuth and platform APIs.
- Never collect or store platform passwords.
- Respect API quotas, platform policies, copyright and spam rules.
- Keep an audit log of generated and published content.

## Initial architecture
- Frontend: Next.js/React
- Backend: Node.js/TypeScript API
- Database: PostgreSQL
- Queue: Redis-compatible job queue
- Storage: S3-compatible object storage
- AI providers: pluggable adapters
- Video worker: FFmpeg-based worker
- Scheduler: persistent job queue/worker

## First milestone
Build dashboard, workspace settings, content pipeline data model, scheduler UI, OAuth connection placeholders, and a local/mock publishing adapter. Add live YouTube/Meta adapters only after OAuth credentials and app permissions are configured.
