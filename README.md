# Court Kachahri Bot - Telegram Admin Panel

Production-ready Telegram bot admin panel for Faculty of Law with separate
frontend and backend architecture.

## Architecture

- **Frontend**: Next.js 15 + shadcn/ui (Vercel)
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **Bot**: Grammy.dev (Telegram bot framework running on Supabase Edge
  Functions)

## Project Structure

```
law-connect-bot/
├── frontend/           # Next.js 15 application
├── supabase/          # Supabase backend (migrations, edge functions)
└── README.md
```

## Setup Instructions

### 1. Supabase Backend

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Initialize Supabase
supabase init

# Link to your project (create one at https://supabase.com/dashboard)
supabase link --project-ref <your-project-ref>

# Push database migrations
supabase db push

# Deploy edge functions
supabase functions deploy telegram-webhook
```

### 2. Next.js Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
# Copy .env.example to .env.local and fill in Supabase credentials

# Run development server
npm run dev
```

### 3. Telegram Bot Setup

```bash
# Set webhook URL (after deploying edge function)
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://<project-ref>.supabase.co/functions/v1/telegram-webhook"
```

## Features

- 🎨 Visual Bot Designer with live preview
- 🔐 Role-based access control (8 admin roles)
- 📢 Push message broadcasting
- 📚 Content management (Notices, Events, Internships, Study Materials)
- 🏫 Academic structure (3 Colleges, 3 Years, Variable Sections)
- 🎭 24 Societies (8 per college)
- 📊 Admin activity monitoring
- 📱 Mobile responsive design

## Tech Stack

- **Next.js 15.1** - React framework with App Router
- **shadcn/ui** - Component library (Tailwind CSS + Radix UI)
- **Supabase** - Backend as a Service (PostgreSQL, Auth, Storage, Edge
  Functions)
- **Grammy.dev** - Modern Telegram bot framework
- **TypeScript** - Type safety
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management

## Law Faculty Structure

- **Colleges**: LC-1, LC-2, CLC
- **Years**: 3 years × 2 semesters each
- **Sections**:
  - LC-1: Year 1 (A-L: 12), Year 2 (A-J: 10), Year 3 (A-I: 9)
  - LC-2: Year 1 (A-K: 11), Year 2 (A-J: 10), Year 3 (A-I: 9)
  - CLC: Year 1 (A-L: 12), Year 2 (A-I: 9), Year 3 (A-I: 9)
- **Societies**: 8 per college (Debate, Moot Court, Legal Aid, Corporate Law,
  Entrepreneurship, Constitutional Law, NSS, North Eastern)
- **Event Types**: 9 types (Debate, Fest, Student Union, Client Counselling,
  Competition, Bhandara Khaoge, Workshop/Seminar, Cultural Program, Any Other
  Event)

## License

MIT
