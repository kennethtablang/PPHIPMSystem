import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Pages intentionally use the `useEffect(() => { load(); }, [filters])`
      // fetch pattern, where load() sets a loading flag synchronously. Every
      // hit of this rule here is that pattern, so it's disabled outright —
      // re-enable if the data layer ever moves to a query library.
      'react-hooks/set-state-in-effect': 'off',
      // toast (Toast.jsx), useAuth (AuthContext.jsx) and usePagination
      // (Pagination.jsx) are deliberate non-component exports; the rule only
      // affects HMR granularity.
      'react-refresh/only-export-components': ['warn', { allowExportNames: ['toast', 'useAuth', 'usePagination'] }],
    },
  },
])
