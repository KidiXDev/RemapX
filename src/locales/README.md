# Localization Guide

This project uses `i18next` + `react-i18next` with JSON resources.

## Supported languages

- `en` (English)
- `id` (Bahasa Indonesia)

## File structure

- `src/locales/en/common.json`
- `src/locales/en/settings.json`
- `src/locales/id/common.json`
- `src/locales/id/settings.json`

Each language should keep the same key structure per namespace.

## Add a new language

1. Create a new folder under `src/locales/<lang>`.
2. Copy all namespace files from `en` and translate values only.
3. Register the new language in:
   - `src/i18n/resources.ts`
   - locale union type in `src/hooks/use-settings-store.ts` (if needed)
   - language selector options in `src/pages/settings.tsx`

## Best practices

- Never rename keys unless you also update all code references.
- Keep interpolation placeholders identical between languages.
- Prefer short, stable keys and human-readable values.
- One namespace per app area (`common`, `settings`, future: `remap`, etc.).
