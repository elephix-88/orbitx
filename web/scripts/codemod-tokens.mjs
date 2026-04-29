/**
 * Phase 8 token codemod — migrate old design tokens to Light Professional.
 * Run once: node scripts/codemod-tokens.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

function findFiles(dir, exts) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findFiles(full, exts));
    } else if (exts.some(e => full.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

const rootDir = new URL('..', import.meta.url).pathname;
const srcDir = join(rootDir, 'src');
const SKIP = new Set([
  join(srcDir, 'index.css'),
]);
const files = findFiles(srcDir, ['.tsx', '.ts', '.css'])
  .filter(f => !SKIP.has(f));

// Order matters: longer/more-specific patterns first to avoid partial replacements.
const replacements = [
  // ── Surfaces ──
  [/bg-surface-primary\/(\d+)/g, 'bg-bg-page/$1'],
  [/bg-surface-secondary\/(\d+)/g, 'bg-bg-card/$1'],
  [/bg-surface-tertiary\/(\d+)/g, 'bg-bg-muted/$1'],
  [/\bbg-surface-primary\b/g, 'bg-bg-page'],
  [/\bbg-surface-secondary\b/g, 'bg-bg-card'],
  [/\bbg-surface-tertiary\b/g, 'bg-bg-muted'],
  [/\bbg-surface-dark\b/g, 'bg-navy'],

  // ── Text ──
  [/\btext-text-primary\b/g, 'text-text-1'],
  [/\btext-text-secondary\b/g, 'text-text-2'],
  [/\btext-text-tertiary\b/g, 'text-text-3'],
  [/\btext-text-inverse\b/g, 'text-white'],

  // ── Borders ──
  [/\bborder-border-subtle\b/g, 'border-line-soft'],
  [/\bborder-border-primary\b/g, 'border-line-1'],
  [/\bborder-border-secondary\b/g, 'border-line-soft'],
  // bare 'border-border' — only when not followed by - (e.g. border-border-subtle already handled)
  [/\bborder-border(?![-\w])/g, 'border-line-1'],

  // ── Primary → blue-primary (opacity variants first) ──
  [/\bbg-primary-500\/5\b/g, 'bg-blue-soft'],
  [/\bbg-primary-500\/10\b/g, 'bg-blue-soft'],
  [/\bbg-primary-500\/20\b/g, 'bg-blue-soft'],
  [/\bbg-primary-500\/30\b/g, 'bg-blue-soft'],
  [/\bfocus:ring-primary-500\/20\b/g, 'focus:ring-blue-soft'],
  [/\bfocus:ring-primary-500\/30\b/g, 'focus:ring-blue-soft'],
  [/\bring-primary-500\/20\b/g, 'ring-blue-soft'],
  [/\bring-primary-500\/30\b/g, 'ring-blue-soft'],
  [/\bborder-primary-500\/30\b/g, 'border-blue-border'],
  [/\bborder-primary-500\/20\b/g, 'border-blue-border'],

  // solid primary classes
  [/\btext-primary-400\b/g, 'text-blue-primary'],
  [/\btext-primary-500\b/g, 'text-blue-primary'],
  [/\btext-primary-600\b/g, 'text-blue-primary'],
  [/\btext-primary-700\b/g, 'text-blue-primary'],
  [/\btext-primary-300\b/g, 'text-blue-primary'],
  [/\bbg-primary-500\b/g, 'bg-blue-primary'],
  [/\bbg-primary-600\b/g, 'bg-blue-primary-hover'],
  [/\bbg-primary-700\b/g, 'bg-blue-primary-hover'],
  [/\bbg-primary-400\b/g, 'bg-blue-primary'],
  [/\bbg-primary-100\b/g, 'bg-blue-soft'],
  [/\bbg-primary-50\b/g, 'bg-blue-soft'],
  [/\bborder-primary-500\b/g, 'border-blue-primary'],
  [/\bborder-primary-600\b/g, 'border-blue-primary'],
  [/\bring-primary-500\b/g, 'ring-blue-primary'],
  [/\bring-primary-600\b/g, 'ring-blue-primary'],
  [/\bfocus:border-primary-500\b/g, 'focus:border-blue-border'],
  [/\bfocus:border-primary-600\b/g, 'focus:border-blue-border'],
  [/\bfocus:ring-primary-500\b/g, 'focus:ring-blue-soft'],
  [/\bhover:bg-primary-500\b/g, 'hover:bg-blue-primary'],
  [/\bhover:bg-primary-600\b/g, 'hover:bg-blue-primary-hover'],
  [/\bhover:text-primary-400\b/g, 'hover:text-blue-primary'],
  [/\bhover:text-primary-500\b/g, 'hover:text-blue-primary'],
  [/\bhover:text-primary-600\b/g, 'hover:text-blue-primary'],
  [/\bhover:border-primary-500\b/g, 'hover:border-blue-border'],
  [/\bfocus:ring-offset-primary-500\b/g, 'focus:ring-offset-blue-primary'],

  // ── Brand ──
  [/\btext-brand-500\b/g, 'text-blue-primary'],
  [/\bbg-brand-500\b/g, 'bg-blue-primary'],
  [/\bborder-brand-500\b/g, 'border-blue-primary'],
];

let filesChanged = 0;
let totalReplacements = 0;

for (const file of files) {
  const original = readFileSync(file, 'utf8');
  let updated = original;
  let fileReplacements = 0;

  for (const [pattern, replacement] of replacements) {
    const before = updated;
    updated = updated.replace(pattern, replacement);
    if (before !== updated) {
      const count = (before.match(pattern) || []).length;
      fileReplacements += count;
    }
  }

  if (updated !== original) {
    writeFileSync(file, updated, 'utf8');
    filesChanged++;
    totalReplacements += fileReplacements;
    const short = file.replace(srcDir + '/', 'src/');
    console.log(`  ✓ ${short} (${fileReplacements} replacements)`);
  }
}

console.log(`\nCOMPLETE: ${totalReplacements} replacements across ${filesChanged} files.`);
