import type React from 'react';

const modules = import.meta.glob<{ default: React.FC }>('./*.tsx', { eager: true });

const overrides: Record<string, React.FC> = {};
for (const [path, module] of Object.entries(modules)) {
  const name = path.replace('./', '').replace('.tsx', '');
  if (module.default) {
    overrides[name] = module.default;
  }
}

export function getOverride(name: string): React.FC | undefined {
  return overrides[name];
}
