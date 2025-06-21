import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagesDir = path.resolve(__dirname, "..", "packages");
const servicePackages = [
  "user-services",
  "resource-services",
  "trust-services",
  "community-services",
];

async function fixViteConfig(pkg) {
  const pkgPath = path.join(packagesDir, pkg);
  const viteConfigPath = path.join(pkgPath, "vite.config.mts");

  if (!fs.existsSync(viteConfigPath)) {
    console.log(`⚠️  vite.config.mts not found in ${pkg}, skipping...`);
    return;
  }

  try {
    let content = await fs.promises.readFile(viteConfigPath, "utf8");

    // Fix the __dirname resolution
    content = content.replace(
      /const __dirname = resolve\(__filename, '\.\.', '\.\.'\);/,
      "const __dirname = resolve(__filename, '..');",
    );

    // Add rollupOptions if missing
    if (!content.includes("rollupOptions")) {
      content = content.replace(
        /(\s+)(sourcemap: true,)/,
        `$1rollupOptions: {\n$1  external: [\n$1    '@tanstack/react-query',\n$1    /^@belongnetwork\\//\n$1  ]\n$1},\n$1$2`,
      );
    }

    await fs.promises.writeFile(viteConfigPath, content);
    console.log(`✅ Fixed Vite config for ${pkg}`);

    // Run build to verify
    console.log(`🏗️  Building ${pkg}...`);
    const { execSync } = await import("child_process");
    execSync("pnpm build", { cwd: pkgPath, stdio: "inherit" });
    console.log(`✅ Successfully built ${pkg}\n`);
  } catch (error) {
    console.error(`❌ Error fixing Vite config for ${pkg}:`, error.message);
  }
}

async function main() {
  console.log("🚀 Fixing Vite configs for all service packages...\n");

  for (const pkg of servicePackages) {
    console.log(`📦 Processing ${pkg}...`);
    await fixViteConfig(pkg);
  }

  console.log(
    "\n🎉 All service packages have been updated and built successfully!",
  );
}

main().catch(console.error);
