# Roadmap Application - Development Setup

A Next.js roadmap management application with authentication, milestone tracking, and timeline visualization.

## Tech Stack

- **Framework**: Next.js 15.5 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js (Google OAuth)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Forms**: React Hook Form + Zod

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **PostgreSQL** (v13 or higher) - [Download](https://www.postgresql.org/download/)
- **Git** (for version control)

## Step 1: Clone and Install Dependencies

```bash
# Navigate to the project directory (you're already here)
cd "C:\Users\julia.dalton\Documents\Cursor Files - Local\Roadmap"

# Install all dependencies
npm install
```

## Step 2: Set Up PostgreSQL Database

1. **Install PostgreSQL** if you haven't already
2. **Create a new database**:

```sql
CREATE DATABASE roadmap_dev;
```

3. **Note your database connection details**:
   - Host (usually `localhost`)
   - Port (usually `5432`)
   - Username (default: `postgres`)
   - Password (set during PostgreSQL installation)
   - Database name (e.g., `roadmap_dev`)

## Step 3: Set Up Google OAuth

You'll need to create a Google OAuth application:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Configure the OAuth consent screen if prompted
6. Select **Web application** as the application type
7. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
8. Copy your **Client ID** and **Client Secret**

## Step 4: Configure Environment Variables

**Important:** If you already have a `.env` file with production values, see [ENVIRONMENT_MANAGEMENT.md](ENVIRONMENT_MANAGEMENT.md) for how to manage dev vs production environments.

For a fresh setup, create a `.env.local` file in the root directory for development:

```env
# Database Connection
DATABASE_URL="postgresql://username:password@localhost:5432/roadmap_dev?schema=public"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-here"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Optional: Comma-separated list of editor emails
EDITOR_EMAILS="your-email@example.com,another-editor@example.com"
```

### Generating NEXTAUTH_SECRET

Run this command to generate a secure secret:

```bash
# On Windows PowerShell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or use an online generator: https://generate-secret.vercel.app/32
```

## Step 5: Set Up the Database

Run Prisma migrations to create the database schema:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations to create tables
npx prisma migrate deploy

# Or use db push for development
npm run db:push
```

### Optional: Seed Initial Data

If you have seed data, you can run:

```bash
# If using the SQL seed file
psql -U postgres -d roadmap_dev -f seed_data.sql

# Or use the Python import script
python import_roadmap_data.py
```

## Step 6: Start the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push schema changes to database (dev)
- `npm run db:migrate` - Deploy migrations (production)

## Database Management

### Prisma Studio (Visual Database Editor)

```bash
npx prisma studio
```

This opens a web interface at [http://localhost:5555](http://localhost:5555) where you can view and edit database records.

### Creating New Migrations

After modifying `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name describe_your_change
```

## User Roles

The application has two roles:

- **VIEWER**: Can view roadmap items (default for all authenticated users)
- **EDITOR**: Can create, edit, and delete items (emails listed in `EDITOR_EMAILS`)

## Project Structure

```
├── app/                      # Next.js App Router pages
│   ├── api/                 # API routes
│   ├── (roadmapViews)/      # Roadmap view pages
│   └── layout.tsx           # Root layout
├── components/              # React components
│   └── ui/                 # Reusable UI components
├── context/                # React context providers
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions and configs
├── prisma/                 # Prisma schema and migrations
├── public/                 # Static assets
└── types/                  # TypeScript type definitions
```

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `pg_isready` (on systems with pg_isready)
- Check your `DATABASE_URL` format
- Ensure the database exists: `psql -U postgres -l`

### Authentication Issues

- Verify `NEXTAUTH_URL` matches your development URL
- Check Google OAuth redirect URIs match exactly
- Ensure `NEXTAUTH_SECRET` is set

### Build Errors

- Clear `.next` folder: `rm -rf .next` (or `Remove-Item -Recurse -Force .next` on PowerShell)
- Delete `node_modules` and reinstall: `npm install`
- Regenerate Prisma Client: `npx prisma generate`

### Port Already in Use

If port 3000 is already in use:

```bash
# Use a different port
npm run dev -- -p 3001
```

## Environment Management

This project supports separate configurations for development and production:

- **`.env.local`** - Your local development environment (gitignored)
- **`.env`** - Production or shared defaults

See [ENVIRONMENT_MANAGEMENT.md](ENVIRONMENT_MANAGEMENT.md) for detailed information on managing multiple environments.

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Development Tips

1. **Hot Reload**: The dev server automatically reloads on file changes
2. **Type Safety**: TypeScript will catch errors during development
3. **Database Changes**: Always run `npx prisma generate` after schema changes
4. **Environment Variables**: Restart the dev server after changing `.env`

## Support

For issues or questions, please contact the development team or create an issue in the repository.

