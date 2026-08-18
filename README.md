# CreatorFlow AI

BUILD: AI Content Assistant — Personal Creator Publishing Platform

1. PRODUCT VISION

Build a production-ready web application called CreatorFlow.

CreatorFlow is a personal AI-powered content management and publishing assistant for a content creator.

The primary purpose is:

Upload one piece of content once → let AI prepare platform-specific metadata → review → schedule → automatically publish to Instagram, TikTok, and YouTube → track publishing status.

This is initially a single-user personal creator application, but the architecture must be designed so it can later support multiple creators.

The application must NOT pretend that social media integrations are already connected if API credentials or OAuth configuration are missing.

Build the actual application architecture, database, authentication, storage, API integration layer, scheduler architecture, error handling, and UI.

2. IMPORTANT DEVELOPMENT PRINCIPLES

Do NOT build a fake demo

Do not create fake upload buttons, fake publishing success messages, fake social media connections, or fake analytics.

Every feature that cannot work without external credentials must clearly show:

Not connected

Configuration required

OAuth required

API approval required

Or another appropriate status

Use real backend functions/API routes where possible.

Never expose OAuth client secrets, API secrets, refresh tokens, or service credentials in frontend code.

All sensitive credentials must stay server-side.

3. CORE USER FLOW

The main workflow should be:

User signs in.

User connects Instagram.

User connects TikTok.

User connects YouTube.

User uploads a video.

Video is stored in secure cloud storage.

User enters optional content context.

AI analyzes the content/context.

AI generates:

Instagram caption

TikTok caption

YouTube title

YouTube description

hashtags

CTA

User reviews and edits AI-generated metadata.

User chooses platforms.

User chooses publish now or schedule.

Application validates platform-specific requirements.

Publishing job is created.

Background job/scheduler executes publishing.

Each platform has its own publishing status.

User sees:

queued

uploading

processing

published

failed

Errors are shown clearly.

User can retry failed publishing.

User can view publishing history.

4. TECH STACK

Prefer the following stack unless Lovable has a strong reason to use an equivalent:

Frontend:

React

TypeScript

Tailwind CSS

shadcn/ui

Backend:

Supabase

Supabase PostgreSQL

Supabase Auth

Supabase Storage

Supabase Edge Functions for server-side integrations

Use Row Level Security.

Use environment variables/secrets for all external API credentials.

AI:

Build an AI service abstraction.

Do not hard-code the application to one AI provider.

Create a server-side AI service that can later support OpenAI or another provider.

The AI API key must never be exposed to the browser.

5. AUTHENTICATION

Implement:

Email/password authentication

Protected application routes

Logout

Session persistence

User profile

The first version is single-user, but every database table containing creator-owned data should have a user_id.

Use Supabase Auth.

Do not store passwords manually.

6. MAIN DASHBOARD

Create a modern creator-focused dashboard.

Design style:

Dark premium creator dashboard

Minimal

Modern

Professional

Responsive

Desktop-first but mobile-friendly

Black / charcoal background

White text

Subtle purple/blue accent

Rounded cards

Clean typography

Avoid excessive gradients

Avoid childish UI

Dashboard sections:

Header

Show:

CreatorFlow logo

Current creator name

Notifications

Settings

Profile

KPI cards

Show:

Content scheduled

Published this week

Failed posts

Connected platforms

Upcoming posts

Show:

Thumbnail

Content title

Platforms

Scheduled time

Status

Recent activity

Show:

Upload completed

AI generated metadata

TikTok published

YouTube published

Instagram published

Publishing failed

Account disconnected

7. CONTENT LIBRARY

Create /content.

This is the creator's content library.

Display content in:

Grid view

List view

Each content item should contain:

Thumbnail

Video filename

Title

Created date

Duration if available

File size

Platforms selected

Publishing status

Scheduled date

Published date

Filters:

All

Draft

Scheduled

Publishing

Published

Failed

Search by:

Title

Filename

Caption

Allow:

Open

Edit

Schedule

Duplicate

Delete

Do not permanently delete immediately.

Prefer soft delete.

8. VIDEO UPLOAD

Create an excellent upload experience.

Page:

/content/new

Support:

Drag & drop

File picker

Video preview

Upload progress

File metadata

Cancel upload

After upload:

Show:

Preview

Filename

File size

MIME type

Duration if available

Validate:

Supported video formats

Maximum file size

Basic video validity

Do not unnecessarily transcode videos in the MVP.

Store original files in Supabase Storage.

Use signed/private storage URLs where appropriate.

9. CONTENT CREATION FORM

After uploading a video, show:

Content context

Fields:

Topic

Example:
"Tips membuat konten konsisten"

Target audience

Example:
"Creator pemula"

Tone

Options:

Casual

Educational

Funny

Professional

Storytelling

Motivational

Provocative

Friendly

Main objective

Options:

Reach

Engagement

Followers

Education

Sales

Brand awareness

Additional instructions

Free text.

Example:

"Jangan terlalu formal. Gunakan bahasa Indonesia yang natural."

10. AI CONTENT GENERATOR

Create a button:

Generate AI Content

The AI should generate platform-specific metadata.

Do NOT simply generate one caption and copy it everywhere.

Generate separate outputs.

Instagram

Generate:

Caption

CTA

Hashtags

TikTok

Generate:

Caption

CTA

Hashtags

YouTube Shorts

Generate:

Title

Description

Hashtags

Optional tags

AI output must be editable before publishing.

11. AI WRITING RULES

The AI should:

Write natural Indonesian

Avoid robotic language

Match the selected tone

Keep platform-specific formatting in mind

Avoid unnecessary hashtags

Avoid spammy hashtags

Avoid false claims

Avoid misleading clickbait

Never invent facts that were not provided

Use short paragraphs

Make hooks strong but believable

Allow the user to regenerate individual sections.

For example:

Regenerate Instagram caption

Regenerate TikTok caption

Regenerate YouTube title

Do NOT regenerate everything when only one section needs regeneration.

12. AI CONTENT EDITOR

Create a workspace with tabs:

Instagram

TikTok

YouTube

Each tab has editable fields.

Instagram:

Caption textarea

CTA

Hashtags

TikTok:

Caption textarea

CTA

Hashtags

YouTube:

Title

Description

Tags

Visibility

Add character counters where appropriate.

Show validation warnings when platform-specific limits are exceeded.

13. SOCIAL ACCOUNT CONNECTIONS

Create:

/settings/integrations

Show cards for:

Instagram

Status:

Connected

Not connected

Connection expired

Error

Buttons:

Connect Instagram

Reconnect

Disconnect

Display:

Username

Profile picture

Account type if available

TikTok

Same pattern.

Display:

Username

Profile picture

Connection status

YouTube

Same pattern.

Display:

Channel name

Channel image

Connection status

14. OAUTH ARCHITECTURE

Implement OAuth using secure server-side callbacks.

Never put client secrets in frontend code.

Create an integration abstraction such as:

interface SocialPlatformAdapter {
  getAuthorizationUrl(): Promise<string>;
  handleOAuthCallback(code: string): Promise<void>;
  refreshTokenIfNeeded(): Promise<void>;
  getAccountInfo(): Promise<AccountInfo>;
  publishVideo(input: PublishVideoInput): Promise<PublishResult>;
  getPublishStatus?(externalId: string): Promise<PublishStatus>;
}


Create separate adapters:

InstagramAdapter

TikTokAdapter

YouTubeAdapter

The rest of the application must not directly depend on platform-specific API implementation.

15. INSTAGRAM INTEGRATION

Implement Instagram publishing through Meta's official APIs.

Do not use browser automation.

Do not store Instagram passwords.

The integration should support professional creator/business accounts where supported by the official API.

Architect the Instagram adapter so it can support Reels/video publishing.

The adapter must handle:

OAuth

Token storage

Token refresh/validation where applicable

Account information

Media upload/publishing

Publishing status

API errors

If the current Meta API requirements require additional permissions, clearly document them in the integration settings.

If API access is not configured, the UI must show:

"Instagram integration requires Meta API configuration."

Do not fake publishing.

16. TIKTOK INTEGRATION

Use TikTok's official Content Posting API.

Support Direct Post architecture.

Required flow:

OAuth authorization.

Obtain access token.

Query creator information.

Display creator publishing options where required.

Initialize video publishing.

Upload video using the appropriate upload mechanism.

Track publish ID/status.

Save publishing result.

Use the official TikTok Content Posting API.

Important:

TikTok may require video.publish authorization and application approval.

Unaudited clients may have publishing restrictions.

The application must therefore expose an integration status such as:

Connected

API not approved

Direct publishing restricted

Ready to publish

Never bypass TikTok restrictions.

Do not use browser automation, unofficial endpoints, cookies, or password scraping.

17. YOUTUBE INTEGRATION

Use the official YouTube Data API.

Use OAuth 2.0.

Support:

Video upload

Title

Description

Tags

Privacy status

Scheduled publishing where supported

Playlist selection if practical

Use the official videos.insert API for upload.

Implement resumable upload where practical.

Store:

YouTube video ID

Channel ID

Publishing status

Published URL

Error information

Do not store the user's Google password.

18. DATABASE DESIGN

Use Supabase PostgreSQL.

Create tables similar to:

profiles

Fields:

id

user_id

display_name

avatar_url

timezone

created_at

updated_at

social_accounts

Fields:

id

user_id

platform

external_account_id

username

display_name

avatar_url

access_token_encrypted

refresh_token_encrypted

token_expires_at

scopes

status

metadata

created_at

updated_at

Never expose token fields to the frontend.

Prefer Supabase Vault or another secure server-side secret mechanism if available.

content

Fields:

id

user_id

title

original_filename

storage_path

thumbnail_path

mime_type

file_size

duration_seconds

status

topic

target_audience

tone

objective

additional_instructions

created_at

updated_at

deleted_at

content_variants

Fields:

id

content_id

platform

title

caption

description

hashtags

tags

cta

ai_generated

edited_by_user

created_at

updated_at

publishing_jobs

Fields:

id

content_id

social_account_id

platform

scheduled_at

status

attempt_count

started_at

completed_at

external_post_id

external_url

error_code

error_message

last_attempt_at

created_at

updated_at

Statuses:

draft

scheduled

queued

uploading

processing

published

failed

cancelled

ai_generations

Fields:

id

user_id

content_id

provider

model

prompt_version

input

output

tokens_used

created_at

activity_logs

Fields:

id

user_id

event_type

content_id

platform

message

metadata

created_at

19. ROW LEVEL SECURITY

Enable RLS on all user-owned tables.

Users must only be able to access their own:

content

content variants

publishing jobs

social accounts

AI generations

activity logs

profile

Never trust user_id supplied from the browser.

Derive authenticated user identity from Supabase Auth.

20. SCHEDULER

Create a publishing scheduler architecture.

The scheduler should find jobs where:

status = scheduled
AND scheduled_at <= now()


Then:

Lock the job.

Change status to queued.

Execute platform adapter.

Change status to uploading.

Upload/publish.

Poll status if needed.

Change to published or failed.

Save external post ID.

Save external URL.

Write activity log.

Prevent duplicate publishing.

Use idempotency.

A job must never accidentally publish twice because of a retry.

21. RETRY SYSTEM

If publishing fails:

Show:

Platform

Error

Time

Retry button

Support automatic retry for transient errors.

Use exponential backoff.

Example:

Attempt 1:
immediately

Attempt 2:
1 minute

Attempt 3:
5 minutes

Attempt 4:
15 minutes

After maximum retries:

Status = failed

Require manual retry.

Do not retry permanent errors indefinitely.

22. SCHEDULING UI

Create:

/schedule

Provide:

Calendar view

List view

Calendar should show:

Content thumbnail

Platform icons

Scheduled time

Status

Allow:

Drag to reschedule

Open post

Edit metadata

Cancel

Duplicate

Time zone must be based on user profile.

Default timezone should be configurable.

23. PUBLISH NOW

The user can click:

Publish Now

Before publishing:

Show confirmation modal:

"You are about to publish this content to:"

Instagram

TikTok

YouTube

Show the exact metadata that will be published.

Then:

Confirm & Publish

Do not publish until the user confirms.

24. PLATFORM-SPECIFIC SETTINGS

For each scheduled post, allow platform-specific settings.

Instagram:

Caption

Hashtags

TikTok:

Caption

Privacy level where supported

Comment setting where supported

Duet setting where supported

Stitch setting where supported

YouTube:

Title

Description

Tags

Visibility

Category if supported

Playlist if supported

Publish/schedule settings

Do not show unsupported settings.

Platform settings must be based on actual API capabilities.

25. POST DETAIL PAGE

Create:

/content/:id

Show:

Media

Large video preview.

General information

Filename

Created date

Duration

Size

AI brief

Topic

Audience

Tone

Objective

Platform variants

Cards/tabs for:

Instagram

TikTok

YouTube

Publishing

For every platform show:

Account

Schedule

Status

Published URL

Error

Retry

26. NOTIFICATIONS

Create an in-app notification system.

Notify the creator when:

Upload completed

AI generation completed

Post published

Post failed

Social account disconnected

Token expired

Scheduled post requires attention

Use toast notifications for immediate actions.

Use notification center for persistent events.

27. ERROR HANDLING

Never show raw API errors directly to users.

Convert errors into understandable messages.

Example:

Instead of:

403 invalid_grant


Show:

YouTube connection has expired. Please reconnect your YouTube account.

Instead of:

TikTok video.publish scope missing


Show:

TikTok publishing permission is not available for this connection. Reconnect the account or verify that your TikTok app has the required publishing permission.

Store technical error details securely in logs.

28. SECURITY

Critical requirements:

Never expose API secrets in frontend.

Never expose OAuth client secrets.

Never store social media passwords.

Encrypt or securely store refresh/access tokens.

Use server-side functions for publishing.

Validate file uploads.

Validate MIME types.

Validate file sizes.

Use signed URLs.

Use RLS.

Rate limit AI generation.

Rate limit publishing operations.

Prevent duplicate jobs.

Sanitize user-generated text.

Validate OAuth state parameters.

Protect OAuth callbacks.

Use CSRF-safe OAuth implementation.

Log security-relevant events.

29. SETTINGS

Create:

/settings

Sections:

Profile

Display name

Timezone

AI

AI provider

Model

Default tone

Default language

Default CTA style

Integrations

Instagram

TikTok

YouTube

Publishing defaults

Default privacy

Default schedule

Default platforms

Security

Logout

Connected accounts

30. CREATOR BRAND PROFILE

Create a feature called:

Brand Voice

The user can define:

About me

Who the creator is.

Niche

Example:

"Content creator tentang bisnis dan personal branding."

Audience

Example:

"Anak muda Indonesia yang ingin mulai membuat konten."

Writing style

Example:

"Bahasa Indonesia santai, seperti ngobrol dengan teman."

Words to avoid

Example:

"Jangan menggunakan kata-kata terlalu formal."

Favorite CTA

Example:

"Kalau kamu suka konten seperti ini, follow."

Content pillars

Allow multiple content pillars.

Example:

Content creation

Social media

Productivity

Personal branding

The AI generator must use this profile as context.

31. AI PROMPT ARCHITECTURE

Do not put the complete AI system prompt in the frontend.

Store prompt templates server-side.

Version prompts.

Example:

content_generation_v1

The AI request should combine:

Brand profile

Content context

Platform

Tone

Objective

User instructions

The AI should return structured JSON.

Example structure:

{
  "instagram": {
    "caption": "...",
    "cta": "...",
    "hashtags": []
  },
  "tiktok": {
    "caption": "...",
    "cta": "...",
    "hashtags": []
  },
  "youtube": {
    "title": "...",
    "description": "...",
    "tags": []
  }
}


Validate the AI response before saving it.

If invalid JSON is returned, safely retry or repair server-side.

32. OPTIONAL VIDEO ANALYSIS

Design the architecture so that later we can add AI video analysis.

Future feature:

User uploads video.

AI can analyze:

Transcript

Main topic

Hook

Key points

CTA

Suggested title

Suggested caption

Suggested chapters

Do NOT require this feature for the first MVP if it significantly increases complexity.

Create the service abstraction now so it can be added later.

33. ANALYTICS ARCHITECTURE

For MVP, build the data model and UI structure for analytics.

Show:

Published posts

Platform

Published date

URL

Status

Later support:

Views

Likes

Comments

Shares

Followers gained

Engagement rate

Do not display fake analytics.

If API access for analytics is not implemented, show:

"Analytics integration coming soon."

34. ACTIVITY LOG

Create an activity timeline.

Examples:

"Video uploaded"

"AI generated Instagram caption"

"YouTube publishing started"

"YouTube video published"

"TikTok publishing failed"

"Instagram account connected"

Each event should include:

timestamp

platform

event

status

35. API / BACKEND STRUCTURE

Organize backend code cleanly.

Suggested structure:

src/
  components/
  pages/
  hooks/
  services/
    ai/
    social/
      instagram/
      tiktok/
      youtube/
    publishing/
  lib/
  types/

supabase/
  functions/
    oauth-instagram/
    oauth-tiktok/
    oauth-youtube/
    ai-generate-content/
    publish-instagram/
    publish-tiktok/
    publish-youtube/
    process-publishing-jobs/
    refresh-social-token/


Adjust according to Lovable/Supabase conventions.

Keep platform-specific logic isolated.

36. SOCIAL PUBLISHING ABSTRACTION

Create a central publishing service.

Example:

publishContent({
  platform,
  socialAccount,
  content,
  variant,
  scheduledJob
})


The service delegates to:

InstagramAdapter
TikTokAdapter
YouTubeAdapter


Never put all three platform implementations into one giant function.

37. STATUS MACHINE

Implement a proper publishing state machine.

Allowed transitions:

draft
  ↓
scheduled
  ↓
queued
  ↓
uploading
  ↓
processing
  ↓
published


Failure:

uploading → failed
processing → failed
queued → failed


Retry:

failed → queued


Cancellation:

scheduled → cancelled


Prevent invalid state transitions.

38. UI EMPTY STATES

Every major page needs useful empty states.

Example:

No content:

Belum ada konten.
Upload video pertama kamu dan biarkan CreatorFlow menyiapkan semuanya.

No social accounts:

Hubungkan akun media sosial kamu untuk mulai melakukan publishing otomatis.

No scheduled posts:

Belum ada konten terjadwal.

No notifications:

Semua aman. Tidak ada notifikasi baru.

39. DEMO / DEVELOPMENT MODE

Create a clear development mode.

If API credentials are not configured:

Do not pretend that publishing works.

Allow UI testing.

Allow database testing.

Allow AI UI testing if AI credentials are configured.

Clearly mark unavailable integrations.

Example:

Integration status: Configuration required

Do NOT create fake "Published successfully" records that look real.

If mock mode is implemented for development, clearly label it:

DEVELOPMENT MOCK MODE

Never enable mock publishing in production.

40. RESPONSIVE DESIGN

Desktop:

Left sidebar.

Mobile:

Bottom navigation or collapsible sidebar.

Navigation:

Dashboard

Content

Schedule

Connections

Settings

Use icons and labels.

41. PERFORMANCE

Optimize:

Video uploads

Large files

Dashboard queries

Database indexes

Lazy loading

Pagination

Background jobs

Never load every video at once.

Use pagination/infinite scroll.

Create indexes for:

user_id

status

scheduled_at

platform

created_at

42. DATABASE MIGRATIONS

Create proper SQL migrations.

Do not manually assume database tables exist.

Create:

tables

indexes

RLS policies

constraints

triggers if needed

Use foreign keys.

Use timestamps.

Use UUIDs.

43. AUDITABILITY

Every publishing action should be traceable.

Store:

user

content

platform

account

scheduled time

attempt time

result

external ID

external URL

error

retry count

This will make debugging possible.

44. MVP PRIORITY

Build in this order:

Phase 1

Auth

Dashboard

Content library

Video upload

Content detail page

Supabase database

Supabase Storage

Phase 2

Brand profile

AI content generation

Platform-specific variants

Editing interface

Phase 3

Social OAuth

Instagram connection

TikTok connection

YouTube connection

Phase 4

Publish now

Scheduling

Publishing jobs

Status tracking

Retry system

Phase 5

Notifications

Activity logs

Better error handling

Phase 6

Analytics

AI video analysis

Multi-user support

Do not attempt to build every advanced feature before the basic workflow works.

45. MOST IMPORTANT USER EXPERIENCE

The primary action should feel like:

UPLOAD VIDEO
      ↓
AI PREPARES CONTENT
      ↓
REVIEW
      ↓
SELECT PLATFORMS
      ↓
SCHEDULE
      ↓
AUTO PUBLISH


The user should NOT need to understand APIs.

The technical complexity must be hidden behind a simple creator-friendly UI.

46. PUBLISHING CONFIRMATION

Before publishing, show a final review screen.

Example:

Ready to publish

VIDEO
[thumbnail]

Platforms
✓ Instagram
✓ TikTok
✓ YouTube

Schedule
17 August 2026
19:00
Asia/Makassar

Instagram
Caption:
...

TikTok
Caption:
...

YouTube
Title:
...

[Back]
[Schedule Post]


47. NO AUTOMATION BYPASS

Never implement:

Browser automation for social media login

Password scraping

Cookie stealing

Unofficial APIs

Reverse-engineered endpoints

CAPTCHA bypass

Anti-bot bypass

Automated login using stored passwords

Only use official APIs/OAuth or officially supported integrations.

If an official API does not support a feature, clearly tell the user instead of implementing an unsafe workaround.

48. ENVIRONMENT VARIABLES

Create a clear .env.example or environment configuration documentation.

Possible variables:

SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

AI_API_KEY

INSTAGRAM_CLIENT_ID
INSTAGRAM_CLIENT_SECRET
INSTAGRAM_REDIRECT_URI

TIKTOK_CLIENT_KEY
TIKTOK_CLIENT_SECRET
TIKTOK_REDIRECT_URI

YOUTUBE_CLIENT_ID
YOUTUBE_CLIENT_SECRET
YOUTUBE_REDIRECT_URI


Do not commit real secrets.

Never display secret values in the UI.

49. DOCUMENTATION

Create a developer documentation page or README explaining:

How to run the app.

How to configure Supabase.

How to configure AI provider.

How to configure Instagram/Meta OAuth.

How to configure TikTok developer application.

How to configure YouTube/Google OAuth.

Required scopes/permissions.

Redirect URLs.

Environment variables.

How the scheduler works.

How publishing jobs work.

How to debug failed publishing.

Clearly mention that platform APIs can require app review/approval.

50. ACCEPTANCE CRITERIA

The MVP is considered successful when:

Authentication

User can sign up.

User can log in.

User can log out.

Content

User can upload a video.

Video is stored securely.

Video appears in content library.

User can open content detail.

AI

User can enter topic/context.

AI generates platform-specific content.

User can edit AI output.

User can regenerate individual platform content.

Integrations

User can connect social accounts through OAuth.

Connection status is visible.

Tokens remain server-side.

Publishing

User can select one or more platforms.

User can publish now.

User can schedule.

Publishing job is created.

Job status updates.

Successful publication stores external ID/URL.

Failed publication stores understandable error.

User can retry.

Security

RLS works.

Users cannot access another user's data.

Secrets are not exposed.

OAuth tokens are not exposed to frontend.

51. IMPORTANT IMPLEMENTATION INSTRUCTION

Do not stop after creating the UI.

Actually implement:

database schema

Supabase integration

authentication

storage

backend functions

AI service abstraction

social integration architecture

publishing job architecture

scheduler architecture

error handling

security policies

When an external API cannot be completed because credentials or approval are required, implement everything that can safely be implemented and leave a clearly documented configuration point.

Do not replace missing integrations with fake functionality.

52. FINAL PRODUCT FEEL

The finished application should feel like:

"My personal AI social media assistant."

Not like a generic admin dashboard.

The creator should be able to open the app and immediately understand:

What content is ready?

What is scheduled?

What has been published?

What failed?

Which accounts are connected?

What should I do next?

The most important action is:

Upload → AI → Review → Schedule → Publish.

Build the foundation cleanly enough that this application can later become a SaaS product for other creators without rewriting the core architecture.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f084fbe6-ecea-4904-8dac-87e5ddf188c1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
