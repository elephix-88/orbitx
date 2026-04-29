/**
 * Phase 8 token codemod — pass 2
 * Removes dark: prefixes, migrates remaining brand/semantic/color tokens.
 * Run: node scripts/codemod-tokens-pass2.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function findFiles(dir, exts) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) results.push(...findFiles(full, exts));
    else if (exts.some(e => full.endsWith(e))) results.push(full);
  }
  return results;
}

const rootDir = new URL('..', import.meta.url).pathname;
const srcDir = join(rootDir, 'src');
const SKIP = new Set([join(srcDir, 'index.css')]);
const files = findFiles(srcDir, ['.tsx', '.ts']).filter(f => !SKIP.has(f));

// Remove entire dark: variant tokens from JSX className strings
// Pattern: matches dark:followed-by-tailwind-class (including opacity /XX)
const DARK_CLASS_RE = /\bdark:[a-zA-Z0-9:!_\-]+(?:\/\d+)?/g;

const replacements = [
  // ── brand-* → blue-primary family ──
  [/\bhover:bg-brand-50\b/g, 'hover:bg-blue-soft'],
  [/\bbg-brand-50\b/g, 'bg-blue-soft'],
  [/\bborder-brand-200\b/g, 'border-blue-border'],
  [/\bborder-brand-500\b/g, 'border-blue-primary'],
  [/\bborder-brand-700\b/g, 'border-blue-primary'],
  [/\btext-brand-400\b/g, 'text-blue-primary'],
  [/\btext-brand-600\b/g, 'text-blue-primary'],
  [/\btext-brand-700\b/g, 'text-blue-primary'],
  [/\bhover:text-brand-700\b/g, 'hover:text-blue-primary'],
  [/\bbg-brand-600\b/g, 'bg-blue-primary-hover'],
  [/\bpeer-checked:bg-brand-600\b/g, 'peer-checked:bg-blue-primary'],
  [/\bpeer-focus:ring-brand-300\b/g, 'peer-focus:ring-blue-soft'],
  [/\bhover:bg-brand-600\b/g, 'hover:bg-blue-primary-hover'],

  // ── Remaining non-system blues → blue-primary ──
  [/\btext-blue-500\b/g, 'text-blue-primary'],
  [/\btext-blue-600\b/g, 'text-blue-primary'],
  [/\btext-blue-700\b/g, 'text-blue-primary'],
  [/\btext-blue-400\b/g, 'text-blue-primary'],
  [/\bbg-blue-500\b/g, 'bg-blue-primary'],
  [/\bbg-blue-600\b/g, 'bg-blue-primary-hover'],
  [/\bhover:bg-blue-primary\/10\b/g, 'hover:bg-blue-soft'],

  // ── Old semantic dark/light variants → base semantic or new tokens ──
  [/\btext-success-dark\b/g, 'text-success'],
  [/\btext-warning-dark\b/g, 'text-warning'],
  [/\btext-error-dark\b/g, 'text-danger'],
  [/\bbg-success-dark\b/g, 'bg-success'],
  [/\bbg-warning-dark\b/g, 'bg-warning'],
  [/\bbg-error-dark\b/g, 'bg-danger'],

  // ── bg-error-light / bg-error / border-error → danger tokens ──
  [/\bbg-error-light\b/g, 'bg-danger-bg'],
  [/\bborder-error\b/g, 'border-danger-border'],
  [/\bborder-error\/20\b/g, 'border-danger-border'],

  // ── info → text-3 / blue-primary ──
  [/\btext-info-dark\b/g, 'text-blue-primary'],
  [/\btext-info\b/g, 'text-blue-primary'],
  [/\bbg-info-light\b/g, 'bg-blue-soft'],
  [/\bbg-info\b/g, 'bg-blue-soft'],

  // ── Non-system semantic opacity → explicit design-system tokens ──
  [/\bbg-success\/10\b/g, 'bg-success-bg'],
  [/\bbg-success\/20\b/g, 'bg-success-bg'],
  [/\bbg-warning\/10\b/g, 'bg-warning-bg'],
  [/\bbg-warning\/20\b/g, 'bg-warning-bg'],
  [/\bborder-success\/60\b/g, 'border-success-border'],
  [/\bbg-success\/5\b/g, 'bg-success-bg'],

  // ── Error/danger opacity → danger-bg ──
  [/\bbg-error\/10\b/g, 'bg-danger-bg'],
  [/\bbg-error\/5\b/g, 'bg-danger-bg'],

  // ── Undefined tokens → nearest system equivalent ──
  [/\bshadow-glow-sm\b/g, 'shadow-sm'],
  [/\bshadow-glow\b/g, 'shadow-md'],
  [/\bborder-surface-primary\b/g, 'border-line-1'],
  [/\bborder-surface-secondary\b/g, 'border-line-1'],
  [/\bborder-t-primary-500\b/g, 'border-t-blue-primary'],
  [/\bborder-b-border\b/g, 'border-b-line-1'],
  [/\bbg-accent-500\b/g, 'bg-blue-primary'],
  [/\btext-accent-500\b/g, 'text-blue-primary'],
  [/\bbg-accent-600\b/g, 'bg-blue-primary-hover'],

  // ── Non-system color classes in editors → system equivalents ──
  // Purple → violet (it's in the system for AI)
  [/\btext-purple-500\b/g, 'text-violet'],
  [/\btext-purple-400\b/g, 'text-violet'],
  [/\bbg-purple-500\/10\b/g, 'bg-violet-bg'],
  // Emerald → success
  [/\btext-emerald-400\b/g, 'text-success'],
  [/\btext-emerald-500\b/g, 'text-success'],
  [/\btext-emerald-600\b/g, 'text-success'],
  [/\bbg-emerald-500\/10\b/g, 'bg-success-bg'],
  [/\bbg-emerald-900\/30\b/g, 'bg-success-bg'],
  // Teal → text-2 (nearest neutral)
  [/\btext-teal-300\b/g, 'text-text-3'],
  [/\btext-teal-600\b/g, 'text-text-2'],
  [/\btext-teal-700\b/g, 'text-text-1'],
  // Orange → warning
  [/\btext-orange-500\b/g, 'text-warning'],
  [/\bbg-orange-500\/10\b/g, 'bg-warning-bg'],
  // Rose → danger
  [/\btext-rose-500\b/g, 'text-danger'],
  // Blue-900/30 → bg-blue-soft
  [/\bbg-blue-900\/30\b/g, 'bg-blue-soft'],
  [/\bbg-blue-500\/10\b/g, 'bg-blue-soft'],

  // ── gray-* in editors (toggle/form) → neutral system ──
  [/\bbg-gray-200\b/g, 'bg-bg-muted'],
  [/\bbg-gray-700\b/g, 'bg-text-2'],
  [/\bborder-gray-300\b/g, 'border-line-2'],
  [/\bborder-gray-600\b/g, 'border-line-2'],
  [/\bbg-neutral-500\b/g, 'bg-text-3'],
  [/\bhover:bg-black\/10\b/g, 'hover:bg-bg-row-hv'],

  // ── PageLoader border-t-primary-500 ──
  [/\bborder-t-primary-500\b/g, 'border-t-blue-primary'],
];

let filesChanged = 0;
let totalReplacements = 0;

for (const file of files) {
  const original = readFileSync(file, 'utf8');
  let updated = original;
  let count = 0;

  // Step 1: Remove all dark: classes
  const before = updated;
  updated = updated.replace(DARK_CLASS_RE, '');
  // Clean up double spaces left by removal
  updated = updated.replace(/  +/g, ' ');
  if (before !== updated) count++;

  // Step 2: Apply token replacements
  for (const [pattern, replacement] of replacements) {
    const before2 = updated;
    updated = updated.replace(pattern, replacement);
    if (before2 !== updated) count++;
  }

  if (updated !== original) {
    writeFileSync(file, updated, 'utf8');
    filesChanged++;
    totalReplacements += count;
    const short = file.replace(srcDir + '/', 'src/');
    console.log(`  ✓ ${short} (${count} passes)`);
  }
}

console.log(`\nCOMPLETE: ${filesChanged} files updated.`);
