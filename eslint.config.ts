import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from 'eslint-config-prettier/flat'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  // flat/recommended 比 essential 多了風格類規則（attributes-order、
  // one-component-per-file 等）。格式相關的規則由最後的 skipFormatting 關掉。
  ...pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,

  {
    // 把 docs/conventions/naming.md 的 TypeScript 命名規則變成機器檢查。
    name: 'app/naming-convention',
    files: ['**/*.{vue,ts,mts,tsx}'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          // 預設：camelCase，結尾不加底線。
          selector: 'default',
          format: ['camelCase'],
          trailingUnderscore: 'forbid',
        },
        {
          // UPPER_CASE 給模組層級的固定常數；PascalCase 給元件 import /
          // defineComponent 的結果。
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          trailingUnderscore: 'forbid',
        },
        {
          // 型別、interface、enum、泛型參數
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          // 物件欄位與型別欄位常常是外部資料或第三方套件定下來的名字
          // （API 回傳的 snake_case、HTTP header 等），import 的名字由來源決定。
          selector: ['objectLiteralProperty', 'typeProperty', 'import'],
          format: null,
        },
        {
          // 名字必須加引號才寫得出來的（例如測試裡的 'onUpdate:modelValue'），
          // 本來就不可能符合任何命名格式。
          selector: 'default',
          modifiers: ['requiresQuotes'],
          format: null,
        },
      ],
    },
  },

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,
)
