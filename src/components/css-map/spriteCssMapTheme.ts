export interface SpriteCssMapCanvasTheme {
  readonly cssVariables: Readonly<Record<string, string>>
  readonly surface: string
  readonly surfaceSubtle: string
  readonly rail: string
  readonly textPrimary: string
  readonly textSecondary: string
  readonly textInverse: string
  readonly border: string
  readonly operation: string
  readonly operationSoft: string
}

export const spriteCssMapFallbackCssVariables: Readonly<Record<string, string>> = {
  '--um-color-page': '#F2F5F8',
  '--um-color-surface': '#FFFFFF',
  '--um-color-surface-subtle': '#E7EEF6',
  '--um-color-rail': '#D8E2EE',
  '--um-color-text-primary': '#162033',
  '--um-color-text-secondary': '#53657A',
  '--um-color-text-inverse': '#FFFFFF',
  '--um-color-border': '#D5DEE8',
  '--um-color-accent': '#2471FF',
  '--um-color-accent-soft': '#E7F0FF',
  '--um-color-operation': '#2471FF',
  '--um-color-operation-soft': '#E7F0FF',
  '--um-color-success': '#22A06B',
  '--um-color-success-soft': '#E6F6EE',
  '--um-color-warning': '#F5B638',
  '--um-color-warning-soft': '#FFF4D8',
  '--um-color-danger': '#E55353',
  '--um-color-danger-soft': '#FDE7E7',
  '--um-color-changeover': '#B7791F',
  '--um-color-changeover-soft': '#FFF4D8',
  '--um-color-cleaning': '#2471FF',
  '--um-color-cleaning-soft': '#E7F0FF',
}

const cssVarPattern = /^var\((--[a-zA-Z0-9-_]+)\)$/

function readCssVariable(name: string, root?: Element | null): string {
  if (typeof globalThis.getComputedStyle !== 'function') {
    return spriteCssMapFallbackCssVariables[name] ?? ''
  }

  const target = root ?? globalThis.document?.documentElement ?? null
  if (!target) return spriteCssMapFallbackCssVariables[name] ?? ''

  const value = globalThis.getComputedStyle(target).getPropertyValue(name).trim()
  return value || spriteCssMapFallbackCssVariables[name] || ''
}

export function createSpriteCssMapCanvasTheme(root?: Element | null): SpriteCssMapCanvasTheme {
  const cssVariables = Object.keys(spriteCssMapFallbackCssVariables).reduce<Record<string, string>>((result, name) => {
    result[name] = readCssVariable(name, root)
    return result
  }, {})

  return {
    cssVariables,
    surface: cssVariables['--um-color-surface'],
    surfaceSubtle: cssVariables['--um-color-surface-subtle'],
    rail: cssVariables['--um-color-rail'],
    textPrimary: cssVariables['--um-color-text-primary'],
    textSecondary: cssVariables['--um-color-text-secondary'],
    textInverse: cssVariables['--um-color-text-inverse'],
    border: cssVariables['--um-color-border'],
    operation: cssVariables['--um-color-operation'],
    operationSoft: cssVariables['--um-color-operation-soft'],
  }
}

export function resolveSpriteCssMapColorToken(
  token: string,
  theme: SpriteCssMapCanvasTheme,
): string {
  const trimmed = token.trim()
  const match = trimmed.match(cssVarPattern)
  if (!match) return trimmed

  return theme.cssVariables[match[1]] ?? spriteCssMapFallbackCssVariables[match[1]] ?? trimmed
}
