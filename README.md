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

## Bolt Configuration

### .bolt/ignore File

The `.bolt/ignore` file is a configuration file that tells Bolt which files and directories to exclude from its context when analyzing your project. This helps optimize performance and prevents Bolt from processing unnecessary files.

#### Purpose

The primary purposes of `.bolt/ignore` are:

1. **Performance Optimization**: Exclude large files, build artifacts, and dependencies that don't need AI analysis
2. **Context Management**: Keep Bolt focused on relevant source code and configuration files
3. **Privacy Protection**: Exclude sensitive files like environment variables, API keys, or personal data
4. **Noise Reduction**: Filter out generated files, logs, and temporary files that add no value to code analysis

#### Creating and Configuring .bolt/ignore

1. **Create the file**: Create a `.bolt/ignore` file in the `.bolt/` directory at your project root:
   ```bash
   mkdir -p .bolt
   touch .bolt/ignore
   ```

2. **Add ignore patterns**: Edit the file using any text editor and add patterns (one per line):
   ```bash
   # Example patterns
   node_modules/
   dist/
   build/
   *.log
   .env*
   ```

3. **Save and apply**: The configuration takes effect immediately - no restart required.

#### Common Ignore Patterns and Use Cases

Here are common patterns you might want to include in your `.bolt/ignore` file:

```bash
# Dependencies and package managers
node_modules/
.pnp/
.pnp.js
.yarn/
pnpm-lock.yaml
package-lock.json
yarn.lock

# Build outputs and artifacts
dist/
build/
out/
.next/
.nuxt/
.vite/
coverage/

# Environment and configuration
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.*

# IDE and editor files
.vscode/
.idea/
*.swp
*.swo
*~

# Operating system files
.DS_Store
Thumbs.db
desktop.ini

# Logs and temporary files
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.tmp/
temp/

# Database and cache files
*.sqlite
*.db
.cache/
.parcel-cache/

# Generated files
*.generated.*
*.auto.*
.tsbuildinfo

# Large media files
*.mp4
*.avi
*.mov
*.mkv
*.iso
*.dmg

# Documentation that doesn't need analysis
docs/api/
CHANGELOG.md
LICENSE
```

#### Pattern Syntax

The `.bolt/ignore` file supports glob patterns similar to `.gitignore`:

- `*` - Matches any number of characters (except path separators)
- `?` - Matches a single character
- `**` - Matches any number of directories
- `!` - Negates a pattern (includes files that would otherwise be ignored)
- `#` - Comments (lines starting with # are ignored)

**Examples:**

```bash
# Ignore all .log files
*.log

# Ignore all files in any logs directory
**/logs/

# Ignore specific file types in specific directories
src/**/*.test.js
packages/*/dist/

# Include specific files that would otherwise be ignored
!important.log

# Comments for organization
# === Build Artifacts ===
dist/
build/

# === Dependencies ===
node_modules/
```

#### Best Practices

1. **Start Broad, Refine Later**: Begin with common patterns and adjust based on your project's needs
2. **Document Your Patterns**: Use comments to explain why certain patterns are ignored
3. **Regular Review**: Periodically review and update patterns as your project evolves
4. **Team Consistency**: Ensure all team members use the same ignore patterns
5. **Environment-Specific**: Consider different patterns for development vs. production environments

**Recommended starter template:**

```bash
# === Dependencies ===
node_modules/
.pnp/
.pnp.js

# === Build Artifacts ===
dist/
build/
out/
*.tsbuildinfo

# === Environment Files ===
.env*
!.env.example

# === IDE Files ===
.vscode/
.idea/
*.swp
*.swo

# === Logs ===
*.log
npm-debug.log*
yarn-debug.log*

# === OS Files ===
.DS_Store
Thumbs.db

# === Cache ===
.cache/
.parcel-cache/
.next/cache/

# === Testing ===
coverage/
.nyc_output/

# === Large Files ===
*.mp4
*.avi
*.zip
*.tar.gz
```

#### Limitations and Considerations

1. **No Regex Support**: Only glob patterns are supported, not full regular expressions
2. **Case Sensitivity**: Patterns are case-sensitive on case-sensitive file systems
3. **Performance Impact**: Very complex patterns with many wildcards may impact performance
4. **No Directory-Specific Rules**: Unlike `.gitignore`, you can't have different rules for different directories
5. **Immediate Effect**: Changes take effect immediately, which might cause confusion during development

#### Interaction with Other Configuration Files

The `.bolt/ignore` file works alongside other configuration files in your project:

- **`.gitignore`**: While similar in syntax, `.bolt/ignore` serves a different purpose. You might want to ignore files for Bolt that you still want in version control
- **`.eslintignore`**: ESLint ignore patterns focus on linting, while Bolt ignore patterns focus on AI analysis
- **`tsconfig.json` exclude**: TypeScript exclusions are for compilation, Bolt exclusions are for context management
- **Package.json files**: Bolt respects package boundaries but `.bolt/ignore` can further refine what's included

**Example of complementary usage:**

```bash
# .gitignore - Version control
node_modules/
dist/
.env

# .bolt/ignore - AI analysis
node_modules/
dist/
.env*
*.log
coverage/
docs/generated/
```

#### Troubleshooting

**Common issues and solutions:**

1. **Pattern not working**: Check for typos and ensure proper glob syntax
2. **Too many files ignored**: Use `!pattern` to include specific files
3. **Performance issues**: Simplify complex patterns or be more specific
4. **Files still appearing**: Remember that changes are immediate - refresh or restart if needed

**Testing your patterns:**

You can test if your patterns work by checking which files Bolt includes in its analysis. If you notice unwanted files being processed, add appropriate patterns to your `.bolt/ignore` file.

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT