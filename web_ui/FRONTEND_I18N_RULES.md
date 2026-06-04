# Frontend Internationalization (i18n) Guidelines

This document contains rules for Antigravity (or any other AI coding assistant) working on this project to ensure all UI texts remain fully translated.

## CRITICAL RULE: NO HARDCODED TEXT
**Never hardcode Korean, English, or any other language text directly in the React components (e.g., `page.tsx`, `layout.tsx`).**

### Why?
The system supports multiple languages (`ko`, `en`, `vi`). If you write static text in the code, the user cannot switch languages for that text.

### How to add new text
1. Open `src/i18n/dictionaries.ts`.
2. Add a new key to ALL language objects (`ko`, `en`, `vi`).
   - Example: `new_feature_btn: '새로운 기능'` (ko), `'New Feature'` (en), `'Tính năng mới'` (vi).
3. In your React component, import and use the `useI18n` hook.
   ```tsx
   import { useI18n } from '@/i18n/I18nProvider';
   
   export default function MyComponent() {
     const t = useI18n();
     return <button>{t.new_feature_btn}</button>; // Correct!
   }
   ```
4. Even for alerts, window.confirms, or placeholders, use the `t.` variables.
   ```tsx
   // Bad
   alert('저장되었습니다.');
   // Good
   alert(t.save_success);
   ```

Always double-check `dictionaries.ts` when adding a new feature that has UI text.
