import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const applicationRoot = join(process.cwd(), 'src', 'app');
const sharedPrimitive = [
  'button',
  'icon-button',
  'panel',
  'page-header',
  'eyebrow',
  'badge',
  'status-badge',
  'event-status',
  'integration-status',
  'alert',
  'tooltip',
  'action-tooltip',
  'dialog-backdrop',
  'dialog-actions',
  'form-field',
  'spinner',
  'loading-state',
  'empty-state',
  'sr-only',
].join('|');
const forbiddenSelector = new RegExp(
  `^\\s*\\.(?:${sharedPrimitive})(?:--[a-z0-9_-]+)?\\s*(?:,|\\{)`,
  'u',
);
const legacyColors = /#(?:3c108e|2e0a70|321070)\b/iu;
const duplicatedSemanticColors = /#(?:eeeef9|fff5f4|f4b4ae|f2fcf7|a6e5c7|eaf8f1|eef0f3)\b/iu;
const findings = [];

function scssFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return scssFiles(path);
    return entry.isFile() && entry.name.endsWith('.scss') ? [path] : [];
  });
}

for (const file of scssFiles(applicationRoot)) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/u);
  lines.forEach((line, index) => {
    if (forbiddenSelector.test(line)) {
      findings.push(
        `${relative(process.cwd(), file)}:${index + 1} redefine una primitiva visual global`,
      );
    }
    if (legacyColors.test(line)) {
      findings.push(
        `${relative(process.cwd(), file)}:${index + 1} utiliza un color institucional obsoleto`,
      );
    }
    if (duplicatedSemanticColors.test(line)) {
      findings.push(
        `${relative(process.cwd(), file)}:${index + 1} duplica un color semántico que debe usar tokens globales`,
      );
    }
  });
}

if (findings.length) {
  console.error('La normalización visual no cumple el contrato global:\n');
  findings.forEach((finding) => console.error(`- ${finding}`));
  console.error(
    '\nUse las primitivas de src/styles.scss y limite el SCSS encapsulado a distribución específica.',
  );
  process.exitCode = 1;
} else {
  console.log('Normalización visual aprobada: no hay primitivas duplicadas ni colores obsoletos.');
}
