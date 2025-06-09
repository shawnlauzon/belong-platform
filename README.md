# Belong Network

@belongnetwork/belong-bolt

A hyper-local community platform that helps neighbors share resources, skills, and gratitude.

## Features

- Resource sharing and requesting
- Community-based trust system
- Real-time location-based matching
- Gratitude and thanks system
- Community organization tools

## Tech Stack

- React + TypeScript
- Vite
- TanStack Router
- Supabase (PostgreSQL + PostGIS)
- Mapbox GL
- Tailwind CSS
- Radix UI Primitives

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Mapbox account

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
VITE_MAPBOX_PUBLIC_TOKEN=your_mapbox_token
VITE_DEFAULT_LOCATION_LAT=30.2672
VITE_DEFAULT_LOCATION_LNG=-97.7431
SEED_MEMBER_ID=your_user_id
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Database Setup

1. Create a new Supabase project
2. Run the migrations from `supabase/migrations/`
3. **Create a storage bucket for images:**
   - Go to Storage in your Supabase dashboard
   - Click "Create a new bucket"
   - Name it `images`
   - Make it public (toggle "Public bucket" to ON)
   - Click "Create bucket"
4. Create a user account in your Supabase project:
   - Go to Authentication > Users in the Supabase dashboard
   - Click "Create User"
   - Fill in the email and password
   - Copy the user's ID from the dashboard (you'll need this for seeding)
5. Add the user's ID to your `.env` file as `SEED_MEMBER_ID`
6. Seed the database:
   ```bash
   npm run seed
   ```
   Note: The seed script will create mock resources owned by the user specified in `SEED_MEMBER_ID`

## Development

### Project Structure

```
src/
  ├── api/          # API interfaces and mock data
  ├── components/   # React components
  ├── core/         # Core utilities (state, event bus)
  ├── features/     # Feature-specific logic
  ├── lib/          # Shared utilities
  ├── routes/       # Application routes
  └── types/        # TypeScript types
```

### Key Concepts

- **Event-Driven Architecture**: UI components emit events, Features handle business logic
- **Trust System**: Community-based reputation scoring
- **Location Services**: Real-time distance calculations and mapping
- **Resource Management**: Sharing and requesting system

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT
