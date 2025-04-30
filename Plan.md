# LeaderCode MVP++: Implementation Plan

**Version:** 1.0
**Target:** Launch a Community-Enhanced AI Tool Navigator with core data accuracy, premium features, initial monetization, and high-quality UX on Fly.io.

---

## Phase 0: Setup & Foundation

-   **[ ] 0.1. Project Initialization:**
    -   [ ] Initialize Next.js project (`npx create-next-app@latest --typescript --tailwind --eslint`).
    -   [ ] Setup Git repository (e.g., on GitHub/GitLab).
    -   [ ] Choose and install a primary Tailwind UI Kit/Plugin (e.g., Flowbite, Preline UI, DaisyUI) for base components.
    -   [ ] Install essential base dependencies (`axios`, `date-fns`, etc.).
-   **[ ] 0.2. Fly.io Account & CLI Setup:**
    -   [ ] Create Fly.io account.
    -   [ ] Install `flyctl` CLI tool and log in.
-   **[ ] 0.3. Database Setup (Fly Postgres):**
    *   [ ] Provision a Fly Postgres instance (`fly postgres create`).
    *   [ ] Note down connection string/details.
    *   [ ] Set DB connection URL as a secret (`fly secrets set DATABASE_URL=...`).
-   **[ ] 0.4. Cache Setup (Fly Redis):**
    *   [ ] Provision a Fly Redis instance (`fly redis create`).
    *   [ ] Note down connection URL.
    *   [ ] Set Redis URL as a secret (`fly secrets set REDIS_URL=...`).
-   **[ ] 0.5. Authentication Setup (Google):**
    *   [ ] Create Google Cloud project and OAuth 2.0 Client ID credentials.
    *   [ ] Note down Client ID and Client Secret.
    *   [ ] Set Google credentials as secrets (`fly secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=...`).
    *   [ ] Set a `NEXTAUTH_SECRET` (`fly secrets set NEXTAUTH_SECRET=$(openssl rand -hex 32)`).
    *   [ ] Set `NEXTAUTH_URL` (`fly secrets set NEXTAUTH_URL=https://your-leadercode-app-name.fly.dev`).
-   **[ ] 0.6. Stripe Account & API Keys:**
    *   [ ] Create Stripe account.
    *   [ ] Define "Pro Plan" Product and Price ID in Stripe Dashboard.
    *   [ ] Get Stripe Publishable Key, Secret Key, and Webhook Signing Secret.
    *   [ ] Set Stripe keys as secrets (`fly secrets set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=... STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=...`).
-   **[ ] 0.7. LLM API Key (Gemini):**
    *   [ ] Obtain Google AI API Key for Gemini.
    *   [ ] Set Gemini API key as secret (`fly secrets set GEMINI_API_KEY=...`).
-   **[ ] 0.8. Proxy Service Account & API Key:**
    *   [ ] Sign up for a proxy service (e.g., BrightData, ScraperAPI).
    *   [ ] Get API key / connection details.
    *   [ ] Set proxy details as secrets (`fly secrets set PROXY_USER=... PROXY_PASS=... PROXY_HOST=... PROXY_PORT=...`).
-   **[ ] 0.9. Error Monitoring (Sentry):**
    *   [ ] Create Sentry account and project.
    *   [ ] Get Sentry DSN.
    *   [ ] Set Sentry DSN as secret (`fly secrets set NEXT_PUBLIC_SENTRY_DSN=...`).
    *   [ ] Integrate Sentry SDK into Next.js app.
-   **[ ] 0.10. Fly.io App Initialization:**
    *   [ ] Run `fly launch` in project directory (adjust suggested settings if needed).
    *   [ ] This creates `fly.toml` and potentially a basic `Dockerfile`.

---

## Phase 1: Core Backend & Data Pipeline

-   **[ ] 1.1. Database Schema Definition (MVP++):**
    -   [ ] Define Prisma schema (`schema.prisma`) or SQL migrations for tables: `User`, `Account`, `Session`, `VerificationToken` (for NextAuth), `Tool`, `Plan`, `Log`, `Subscription`, `ToolSuggestion`, `CategorySuggestion`, `Review`, `Referral`. Include relations, indexes.
    -   [ ] Add `referral_code`, `referred_by_code`, `pro_credits_earned` to `User`.
    -   [ ] Add Stripe fields to `Subscription`.
    -   [ ] Run initial migration (`npx prisma migrate dev` or `fly pg connect -a <db-app-name> < migration.sql`).
-   **[ ] 1.2. Authentication Implementation:**
    -   [ ] Install `next-auth` and Prisma adapter (`@next-auth/prisma-adapter`).
    -   [ ] Configure NextAuth API route (`pages/api/auth/[...nextauth].ts`) with Google Provider and Prisma Adapter.
    -   [ ] Add Sign In / Sign Out buttons/logic to frontend layout.
    -   [ ] Generate unique `referral_code` for users on creation.
-   **[ ] 1.3. Playwright Scraper Setup:**
    -   [ ] Install `playwright`.
    -   [ ] Create basic scraper function (`lib/scraper.ts`) that takes a URL, uses Playwright with proxy settings (from secrets), handles basic waits, and returns page HTML/content.
    -   [ ] Ensure Playwright browser dependencies are added to the `Dockerfile`.
-   **[ ] 1.4. LLM Analysis Setup (Gemini):**
    -   [ ] Install Google AI SDK (`@google/generative-ai`).
    -   [ ] Create analysis function (`lib/analyzer.ts`) that takes HTML/text, sends it to Gemini 1.5 Flash API with structured output prompt (Function Calling), validates output against Zod schema for `Plan` data.
    -   [ ] Implement basic retry logic for API calls.
-   **[ ] 1.5. Background Worker & Job Queue:**
    -   [ ] Install Redis client (`ioredis`) and queue library (`bullmq`).
    -   [ ] Configure BullMQ connection using Redis secret.
    -   [ ] Define queues (e.g., `scrapeQueue`, `analyzeQueue`).
    -   [ ] Create worker process entry point (`workers/index.ts`) that listens to queues.
    -   [ ] Implement worker logic:
        -   Scrape worker: Takes `toolId`, fetches tool URL, calls scraper, adds analysis job.
        -   Analysis worker: Takes `toolId`, `htmlContent`, calls analyzer, saves valid plan data to DB, updates `Tool.last_scraped`.
    -   [ ] Configure `fly.toml` to run this worker process (e.g., `[processes]\n worker = "npm run start:worker"`).
-   **[ ] 1.6. Scheduling:**
    -   [ ] Install `node-cron`.
    -   [ ] Add logic *within the worker process* to schedule daily jobs (e.g., fetch all active tools, add scrape jobs to `scrapeQueue`).
    -   *Alternative:* Configure Fly Scheduled Machines if preferred over `node-cron`.
-   **[ ] 1.7. Logging:**
    -   [ ] Implement basic logging within scraper, analyzer, workers, API routes (use `console.log` initially, captured by Fly Logs; Sentry for errors).
    -   [ ] Store critical errors or processing summaries in the `Log` DB table.
-   **[ ] 1.8. Seeding Initial Tools:**
    -   [ ] Create a script or manually add the initial ~20-30 curated tools to the `Tool` table in the database.

---

## Phase 2: Frontend Development & Core Features

-   **[ ] 2.1. Basic Layout & Design System Application:**
    -   [ ] Create main app layout (`components/Layout.tsx`) including header (with Auth state) and footer.
    -   [ ] Apply base styling, dark mode toggle, fonts defined in Tailwind config. Start building reusable core components (Button, Card, Input, etc.) based on chosen UI kit / design direction. Use Storybook to document components (Optional for MVP++ but recommended).
-   **[ ] 2.2. Leaderboard Page (`pages/index.tsx`):**
    -   [ ] Fetch tool and plan data (use `getServerSideProps` or client-side fetching with loading states).
    *   [ ] Implement Card or advanced Table layout for displaying tools. Use Framer Motion for list loading/sorting animations.
    -   [ ] Display key data: Name, Category, Core Pricing, Features List, Last Updated.
-   **[ ] 2.3. Filtering Implementation:**
    -   [ ] Create filter sidebar component.
    -   [ ] Add checkboxes for Categories (fetched from DB or enum).
    -   [ ] Add checkboxes for key boolean features (e.g., "Free Tier", "Vision" - based on simple analysis initially).
    -   [ ] Implement client-side or server-side filtering logic based on checkbox state.
-   **[ ] 2.4. Sorting Implementation:**
    -   [ ] Add clickable headers/buttons with directional arrows.
    -   [ ] Implement client-side or server-side sorting logic based on selected column/direction.
-   **[ ] 2.5. Tool Detail Page (`pages/tool/[toolId].tsx`):**
    -   [ ] Fetch detailed data for a specific tool, including all its plans.
    -   [ ] Display tool information and detailed plan comparison.
    -   [ ] Add "Official Website" / "Pricing Page" links.
-   **[ ] 2.6. Tool Comparison Feature:**
    -   [ ] Add checkboxes to leaderboard items to select for comparison.
    -   [ ] Implement state management for selected tools.
    *   [ ] Create comparison view (modal or separate page `/compare?ids=...`) displaying selected tools side-by-side. Limit selection (e.g., 2-4 tools).

---

## Phase 3: Community Features

-   **[ ] 3.1. Suggestion Forms & Backend:**
    -   [ ] Create pages/components for "Suggest a Tool" and "Suggest a Category" forms (require login).
    -   [ ] Create API routes (`/api/suggestions/tool`, `/api/suggestions/category`) to handle form submissions and save to respective DB tables (`status: 'pending'`).
-   **[ ] 3.2. Review Submission & Display:**
    -   [ ] Add Review form component (Rating stars, Textarea) to Tool Detail page (require login).
    -   [ ] Create API route (`/api/reviews`) to handle review submissions (save to `Review` table).
    -   [ ] Fetch and display average rating and list of reviews on Tool Detail page. Mark "Pro User" reviews if applicable.
-   **[ ] 3.3. Basic Admin Review Interface (Internal Tool):**
    -   [ ] Create simple password-protected pages or use a tool like Retool/Appsmith connected to the DB for admins to view pending `ToolSuggestion` and `CategorySuggestion`.
    -   [ ] Add buttons for Admin to Approve/Reject suggestions (updates status in DB). Manual addition of approved tools/categories required for MVP++.

---

## Phase 4: Monetization & Partnerships

-   **[ ] 4.1. Stripe Checkout Integration:**
    -   [ ] Install Stripe JS libraries.
    -   [ ] Add "Upgrade to Pro" button/section in UI (visible to non-Pro users).
    -   [ ] Create API route (`/api/stripe/create-checkout-session`) to generate Stripe Checkout session for the Pro Plan Price ID, associating it with the logged-in user's email/ID.
    -   [ ] Redirect users to Stripe Checkout from the frontend.
    -   [ ] Create Success (`/subscribe/success`) and Cancel (`/subscribe/cancel`) pages.
-   **[ ] 4.2. Stripe Webhook Handler:**
    -   [ ] Create API route (`/api/stripe/webhook`) to receive Stripe events.
    -   [ ] Verify webhook signature using `STRIPE_WEBHOOK_SECRET`.
    -   [ ] Handle events:
        -   `checkout.session.completed`: Create/update `Subscription` record, store `stripe_customer_id`, `stripe_subscription_id`, set `status: 'active'`. Check if user was referred and update `Referral` table.
        -   `invoice.paid`: Update `current_period_end`. Trigger referral credit award if applicable.
        -   `customer.subscription.updated`/`deleted`: Update `Subscription` status, `current_period_end`, `cancel_at_period_end`.
-   **[ ] 4.3. Feature Gating:**
    -   [ ] Create middleware or helper functions to check user's subscription status (fetched from DB via session).
    -   [ ] Conditionally render UI elements (e.g., "Upgrade" prompts, Pro features).
    -   [ ] Protect API routes for Pro features.
-   **[ ] 4.4. AI Blueprint Generator (Pro Feature):**
    -   [ ] Create dedicated page/component (`/generate-plan`) accessible only to Pro users.
    -   [ ] Add text input for project description.
    -   [ ] Create API route (`/api/generate-plan`) (Pro protected):
        -   Check user's monthly usage count (implement simple counter in `User` or `Subscription` table). Return error if limit exceeded.
        -   Call Gemini 1.5 Flash via `lib/analyzer.ts` (or dedicated function) with specific "generate implementation plan" prompt.
        -   Return generated Markdown content.
    -   [ ] Display generated Markdown nicely on the frontend. Increment usage counter.
-   **[ ] 4.5. Referral Program Backend Logic:**
    -   [ ] API endpoint/logic to retrieve user's referral code.
    -   [ ] Logic in webhook handler to check `referred_by_code` when a subscription starts, find referrer, update `Referral` record, and increment `pro_credits_earned` on referrer's `User` record.
    -   [ ] *MVP Redemption:* Manual credit application or simple logic to check credits before creating next Stripe invoice (more complex). Focus on awarding credits first.
-   **[ ] 4.6. Affiliate Links & Partner Offers:**
    -   [ ] Manually add affiliate links to the `Tool` records in the DB where available.
    -   [ ] Display these links conditionally in the UI. Add global disclaimer.
    -   [ ] Create simple mechanism (e.g., Markdown field in `Tool` record or separate table) to store special offer details.
    -   [ ] Conditionally display partner offers only to logged-in Pro users.

---

## Phase 5: Deployment & Final Touches

-   **[ ] 5.1. Fly.io Configuration (`fly.toml`, `Dockerfile`):**
    -   [ ] Finalize `Dockerfile` ensuring Playwright dependencies, Node.js version, build steps (`prisma generate`, `next build`), and start commands are correct.
    -   [ ] Configure `fly.toml`: Define `web` and `worker` processes, set environment variables (use secrets!), configure health checks, volumes (if needed), define Postgres/Redis attachments.
    -   [ ] Set machine sizes appropriately (worker might need more RAM for Playwright).
-   **[ ] 5.2. Domain & HTTPS:**
    -   [ ] Configure custom domain on Fly.io (`fly certs ...`). Fly handles HTTPS automatically.
    -   [ ] Update `NEXTAUTH_URL` secret.
-   **[ ] 5.3. Pre-launch Testing:**
    -   [ ] Thoroughly test all features: Auth, Scraping (on a few tools), Analysis, Filtering/Sorting, Comparison, Suggestions, Reviews, Stripe Checkout/Webhooks (in test mode), Referral code logic, AI Plan Generation (as Pro user), Deployment.
    -   [ ] Test responsiveness across devices.
    -   [ ] Basic performance checks.
-   **[ ] 5.4. Initial Deployment:**
    -   [ ] Run `fly deploy`. Monitor logs closely.
-   **[ ] 5.5. Setup Monitoring & Alerting:**
    -   [ ] Configure basic Sentry alert rules.
    -   [ ] Set up basic Fly.io metrics monitoring/alerts if needed.

---

## Post-MVP++ Launch (Phase 6+)

-   Gather user feedback.
-   Monitor system performance, costs, and error rates.
-   Prioritize fixing critical bugs.
-   Begin planning V1 features based on MVP++ feedback and strategic goals (e.g., expanding tool coverage, adding categories, enhancing AI features, improving admin tools).
-   Iterate on UI/UX based on feedback.
-   Automate referral credit redemption.
-   Automate admin review workflows.
