import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database } from '../src/shared/types/database';

// Parse command line arguments for .env file
const args = process.argv.slice(2);
let envFile = '.env.local'; // default

// Look for --env flag
const envIndex = args.findIndex((arg) => arg === '--env' || arg === '-e');
if (envIndex !== -1 && envIndex + 1 < args.length) {
  envFile = args[envIndex + 1];
}

// Load environment variables from specified file
console.log(`📁 Loading environment from: ${envFile}`);
dotenv.config({ path: envFile });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'Missing required environment variables: VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY',
  );
  process.exit(1);
}

// Create Supabase client with service key for admin access (bypasses RLS)
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Character set matching the database function
const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excludes 0,1,I,O to avoid confusion

/**
 * Generate a connection code using the same logic as the database function
 */
function generateConnectionCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * CHARSET.length);
    code += CHARSET[randomIndex];
  }
  return code;
}

/**
 * Check if a code already exists in the database
 */
async function codeExists(code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('community_member_codes')
    .select('code')
    .eq('code', code)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found
    throw new Error(`Error checking code existence: ${error.message}`);
  }

  return data !== null;
}

/**
 * Generate a unique connection code with retry logic
 */
async function generateUniqueCode(maxAttempts: number = 10): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const code = generateConnectionCode();

    if (!(await codeExists(code))) {
      return code;
    }

    console.log(`  Code collision (attempt ${attempt}), retrying...`);
  }

  throw new Error(
    `Failed to generate unique code after ${maxAttempts} attempts`,
  );
}

/**
 * Find all community members who don't have active connection codes
 */
async function findMembersWithoutCodes() {
  // Fetch all memberships with community and user info
  const { data: memberships, error: membershipError } = await supabase.from(
    'community_memberships',
  ).select(`
      user_id,
      community_id,
      communities!inner(name),
      profiles!inner(email)
    `);

  if (membershipError) {
    throw new Error(`Failed to fetch memberships: ${membershipError.message}`);
  }

  // Fetch all existing active codes
  const { data: existingCodes, error: codesError } = await supabase
    .from('community_member_codes')
    .select('user_id, community_id')
    .eq('is_active', true);

  if (codesError) {
    throw new Error(`Failed to fetch existing codes: ${codesError.message}`);
  }

  // Create a set of existing user-community pairs for efficient lookup
  const existingCodesSet = new Set(
    existingCodes?.map((c) => `${c.user_id}-${c.community_id}`) || [],
  );

  // Filter out memberships that already have codes
  return (
    memberships
      ?.filter((m) => !existingCodesSet.has(`${m.user_id}-${m.community_id}`))
      .map((m) => ({
        user_id: m.user_id,
        community_id: m.community_id,
        community_name: (m.communities as any).name,
        user_email: (m.profiles as any).email,
      })) || []
  );
}

/**
 * Insert a connection code for a specific user-community pair
 */
async function insertConnectionCode(
  userId: string,
  communityId: string,
  code: string,
): Promise<void> {
  const { error } = await supabase.from('community_member_codes').insert({
    code,
    user_id: userId,
    community_id: communityId,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to insert code: ${error.message}`);
  }
}

async function backfillConnectionCodes(dryRun: boolean = false) {
  try {
    console.log('🔍 Finding community members without connection codes...');

    const membersWithoutCodes = await findMembersWithoutCodes();

    if (membersWithoutCodes.length === 0) {
      console.log('✅ All community members already have connection codes!');
      return;
    }

    console.log(
      `📋 Found ${membersWithoutCodes.length} members without connection codes:\n`,
    );

    // Group by community for better readability
    const membersByCommunity = membersWithoutCodes.reduce(
      (acc, member) => {
        if (!acc[member.community_name]) {
          acc[member.community_name] = [];
        }
        acc[member.community_name].push(member);
        return acc;
      },
      {} as Record<string, typeof membersWithoutCodes>,
    );

    // Display summary
    Object.entries(membersByCommunity).forEach(([communityName, members]) => {
      console.log(`  📍 ${communityName}: ${members.length} members`);
      members.forEach((member) => {
        console.log(`     - ${member.user_email}`);
      });
      console.log();
    });

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No codes will be generated');
      console.log(
        `Would generate ${membersWithoutCodes.length} connection codes`,
      );
      return;
    }

    console.log('🚀 Starting connection code generation...\n');

    let successCount = 0;
    let failureCount = 0;
    const failures: Array<{ member: any; error: string }> = [];

    for (const member of membersWithoutCodes) {
      try {
        console.log(
          `Generating code for ${member.user_email} in ${member.community_name}...`,
        );

        const code = await generateUniqueCode();
        await insertConnectionCode(member.user_id, member.community_id, code);

        console.log(`  ✅ Generated code: ${code}`);
        successCount++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.log(`  ❌ Failed: ${errorMessage}`);
        failureCount++;
        failures.push({ member, error: errorMessage });
      }
    }

    console.log(`\n📊 Generation complete:`);
    console.log(`  ✅ Successfully generated: ${successCount} codes`);
    console.log(`  ❌ Failed to generate: ${failureCount} codes`);

    if (failures.length > 0) {
      console.log(`\n❌ Failures:`);
      failures.forEach(({ member, error }) => {
        console.log(
          `  - ${member.user_email} in ${member.community_name}: ${error}`,
        );
      });

      if (failureCount > successCount) {
        console.error('\n🚨 More failures than successes - please investigate');
        process.exit(1);
      }
    }

    if (successCount > 0) {
      console.log(
        `\n🎉 Successfully backfilled ${successCount} connection codes!`,
      );
    }
  } catch (error) {
    console.error('💥 Error during connection code backfill:', error);
    process.exit(1);
  }
}

// Parse command line arguments (excluding --env and its value)
const filteredArgs = args.filter((arg, index) => {
  // Skip --env flag and its value
  if (arg === '--env' || arg === '-e') return false;
  if (index > 0 && (args[index - 1] === '--env' || args[index - 1] === '-e'))
    return false;
  return true;
});

const isDryRun =
  filteredArgs.includes('--dry-run') || filteredArgs.includes('-n');
const isTest = filteredArgs.includes('--test');

if (isTest) {
  // Test mode - generate some sample codes
  console.log('🧪 TEST MODE - Generating sample connection codes\n');

  console.log('Sample codes:');
  for (let i = 0; i < 10; i++) {
    const code = generateConnectionCode();
    console.log(`  ${i + 1}. ${code}`);
  }

  console.log(`\nCharacter set: ${CHARSET}`);
  console.log(`Character set length: ${CHARSET.length}`);
  console.log('✅ Code generation test complete');
} else {
  if (isDryRun) {
    console.log('🔍 Running in DRY RUN mode\n');
  }

  // Run the backfill script
  backfillConnectionCodes(isDryRun);
}
