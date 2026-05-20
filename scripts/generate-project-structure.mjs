import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(process.cwd());
const outputPath = path.join(rootDir, "PROJECT_STRUCTURE.md");
const frontendRoot = path.join(rootDir, "frontend-main");
const workspaceLabel = path.basename(rootDir).trim() || path.basename(rootDir);

const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "target",
  ".vite",
  ".vite-temp",
]);

const IGNORE_FILES = new Set([
  ".DS_Store",
]);

function exists(targetPath) {
  return fs.existsSync(targetPath);
}

function readJson(targetPath) {
  return JSON.parse(fs.readFileSync(targetPath, "utf8"));
}

function listDir(targetPath) {
  return fs
    .readdirSync(targetPath, { withFileTypes: true })
    .filter((entry) => !IGNORE_FILES.has(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function walkDir(targetPath, depth = 0, maxDepth = 2) {
  if (!exists(targetPath) || depth > maxDepth) {
    return [];
  }

  const lines = [];

  for (const entry of listDir(targetPath)) {
    if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) {
      continue;
    }

    const prefix = "  ".repeat(depth);
    lines.push(`${prefix}- ${entry.name}${entry.isDirectory() ? "/" : ""}`);

    if (entry.isDirectory()) {
      lines.push(...walkDir(path.join(targetPath, entry.name), depth + 1, maxDepth));
    }
  }

  return lines;
}

function summarizeWorkspace(workspaceRoot) {
  const packageJsonPath = path.join(workspaceRoot, "package.json");
  const packageJson = readJson(packageJsonPath);
  const modulesDir = path.join(workspaceRoot, "modules");
  const packagesDir = path.join(workspaceRoot, "packages");

  const moduleDirs = exists(modulesDir)
    ? listDir(modulesDir).filter((entry) => entry.isDirectory() && !IGNORE_DIRS.has(entry.name))
    : [];
  const packageDirs = exists(packagesDir)
    ? listDir(packagesDir).filter((entry) => entry.isDirectory() && !IGNORE_DIRS.has(entry.name))
    : [];

  const referencedLocalDeps = Object.entries(packageJson.dependencies ?? {})
    .filter(([, value]) => typeof value === "string" && value.startsWith("file:"))
    .map(([name, value]) => ({ name, relativePath: value.replace(/^file:/, "") }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const missingWorkspaces = referencedLocalDeps
    .filter((dependency) => !exists(path.join(workspaceRoot, dependency.relativePath)))
    .map((dependency) => `- \`${dependency.name}\` -> \`${dependency.relativePath}\``);

  return {
    packageJson,
    moduleDirs,
    packageDirs,
    missingWorkspaces,
  };
}

function buildModuleSection(workspaceRoot, moduleName) {
  const moduleRoot = path.join(workspaceRoot, "modules", moduleName);
  const packageJsonPath = path.join(moduleRoot, "package.json");
  const srcRoot = path.join(moduleRoot, "src");
  const packageJson = exists(packageJsonPath) ? readJson(packageJsonPath) : null;
  const srcEntries = exists(srcRoot)
    ? listDir(srcRoot)
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    : [];

  const summary = packageJson
    ? `Package: \`${packageJson.name}\`${packageJson.version ? ` | Version: ${packageJson.version}` : ""}`
    : "Package metadata unavailable";

  const srcSummary = srcEntries.length
    ? srcEntries.map((entry) => `\`${entry}\``).join(", ")
    : "No `src/` subdirectories detected";

  return [
    `### \`modules/${moduleName}\``,
    summary,
    `Source areas: ${srcSummary}`,
    "",
  ].join("\n");
}

function buildPackageSection(workspaceRoot, packageName) {
  const packageRoot = path.join(workspaceRoot, "packages", packageName);
  const packageJsonPath = path.join(packageRoot, "package.json");
  const srcRoot = path.join(packageRoot, "src");
  const packageJson = exists(packageJsonPath) ? readJson(packageJsonPath) : null;
  const srcFiles = exists(srcRoot)
    ? listDir(srcRoot).map((entry) => `${entry.name}${entry.isDirectory() ? "/" : ""}`)
    : [];

  const summary = packageJson
    ? `Package: \`${packageJson.name}\`${packageJson.version ? ` | Version: ${packageJson.version}` : ""}`
    : "Package metadata unavailable";

  const exportSummary = srcFiles.length
    ? srcFiles.map((entry) => `\`${entry}\``).join(", ")
    : "No `src/` contents detected";

  return [
    `### \`packages/${packageName}\``,
    summary,
    `Primary contents: ${exportSummary}`,
    "",
  ].join("\n");
}

function generateMarkdown() {
  const workspace = summarizeWorkspace(frontendRoot);
  const generatedAt = new Date().toISOString();

  const rootTree = walkDir(rootDir, 0, 2);
  const frontendTree = walkDir(frontendRoot, 0, 3);

  const moduleSections = workspace.moduleDirs.map((entry) => buildModuleSection(frontendRoot, entry.name));
  const packageSections = workspace.packageDirs.map((entry) => buildPackageSection(frontendRoot, entry.name));

  return [
    "# PROJECT_STRUCTURE",
    "",
    `Last generated: \`${generatedAt}\``,
    "",
    "## Purpose",
    "",
    "This file documents the current filesystem structure of the `optimile FE 2.0` workspace.",
    "Regenerate it after any file, folder, or major code-area change by running:",
    "",
    "```bash",
    "node scripts/generate-project-structure.mjs",
    "```",
    "",
    "## Workspace Overview",
    "",
    `- Workspace root: \`${workspaceLabel}\``,
    `- Main application workspace: \`frontend-main/\``,
    `- Frontend modules detected: ${workspace.moduleDirs.length}`,
    `- Shared packages detected: ${workspace.packageDirs.length}`,
    "",
    "## Root Structure",
    "",
    "```text",
    ...rootTree,
    "```",
    "",
    "## frontend-main Structure",
    "",
    "```text",
    ...frontendTree,
    "```",
    "",
    "## Workspace Modules",
    "",
    ...moduleSections,
    "## Shared Packages",
    "",
    ...packageSections,
    "## Notes",
    "",
    "- Generated structure excludes heavy or derived directories such as `.git/`, `node_modules/`, `dist/`, `build/`, `coverage/`, and `target/`.",
    "- The outer workspace folder is not the Git repository root; the nested Git repository currently lives inside `frontend-main/`.",
    ...(workspace.missingWorkspaces.length
      ? [
          "- `frontend-main/package.json` references local workspaces that are not present on disk right now:",
          ...workspace.missingWorkspaces.map((line) => `${line} (missing)`),
        ]
      : ["- All local `file:` workspace dependencies referenced by `frontend-main/package.json` are present on disk."]),
    "",
  ].join("\n");
}

fs.mkdirSync(path.join(rootDir, "scripts"), { recursive: true });
fs.writeFileSync(outputPath, generateMarkdown(), "utf8");

console.log(`Generated ${path.relative(rootDir, outputPath)}`);
