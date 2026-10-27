import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginOxlint from 'eslint-plugin-oxlint'
import pluginVitest from '@vitest/eslint-plugin'
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

  {
    // 模板慣例：不用 v-html（字串直接當 HTML 塞進頁面，繞過 Vue 的渲染），
    // 外連一律帶 rel。目前全站沒有用到 v-html（Markdown 內文走 AST 轉 vnode，見 MarkdownBody.vue）。
    name: 'app/template-conventions',
    files: ['**/*.vue'],
    rules: {
      'vue/no-v-html': 'error',
      // target="_blank" 的連結一律要帶 rel="noopener noreferrer"
      'vue/no-template-target-blank': 'error',
    },
  },

  {
    // 動態執行字串當程式碼的寫法（eval、new Function、setTimeout('字串')）
    // 目前全站沒有用到，列成規則是為了不讓之後的新程式引進來。
    name: 'app/no-dynamic-code',
    files: ['**/*.{vue,ts,mts,tsx}'],
    languageOptions: {
      // no-implied-eval 要靠「setTimeout 是全域變數」才認得出 setTimeout('字串')；
      // 這份設定沒有宣告瀏覽器全域，不補的話這條規則永遠不會報。
      globals: {
        setTimeout: 'readonly',
        setInterval: 'readonly',
        execScript: 'readonly',
        window: 'readonly',
        globalThis: 'readonly',
      },
    },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },

  {
    // 把 AGENTS.md 的測試命名規則變成機器檢查：it／test 的說明寫「它應該…」；
    // describe 寫被測對象（元件、函式或情境名稱），所以不能寫成「它應該…」。
    name: 'app/vitest-titles',
    files: ['**/*.spec.ts'],
    ignores: [
      // 舊檔還沒改成「它應該」句型；改到某個檔案時順手改標題，並把它移出清單。新檔一律要符合。
      'src/api/articles.spec.ts',
      'src/api/client.spec.ts',
      'src/api/graph.spec.ts',
      'src/api/ontology.spec.ts',
      'src/api/projects.spec.ts',
      'src/api/techniqueLabel.spec.ts',
      'src/components/ArticleEditLink.spec.ts',
      'src/components/AuthNotice.spec.ts',
      'src/components/AuthOnly.spec.ts',
      'src/components/AuthStatus.spec.ts',
      'src/components/BaseSegmented.spec.ts',
      'src/components/BaseSwitch.spec.ts',
      'src/components/BaseTextarea.spec.ts',
      'src/components/TheNavbar.spec.ts',
      'src/components/ThemeToggle.spec.ts',
      'src/components/graph/GraphShortcutsHelp.spec.ts',
      'src/components/graph/clusterForce.spec.ts',
      'src/components/graph/colorScale.spec.ts',
      'src/components/graph/derivedEdges.spec.ts',
      'src/components/graph/fitView.spec.ts',
      'src/components/graph/graphDetail.spec.ts',
      'src/components/graph/labels.spec.ts',
      'src/components/graph/layeredLayout.spec.ts',
      'src/components/graph/viewMath.spec.ts',
      'src/components/graphNodeLink.spec.ts',
      'src/components/graphRelationPhrase.spec.ts',
      'src/components/markdown/MarkdownBody.spec.ts',
      'src/components/markdown/safeLink.spec.ts',
      'src/composables/useProjectsFilter.spec.ts',
      'src/composables/useTheme.spec.ts',
      'src/data/articles.spec.ts',
      'src/router/index.spec.ts',
      'src/siteMeta.spec.ts',
      'src/stores/useAuthStore.spec.ts',
      'src/views/ArticlesView.spec.ts',
      'src/views/NotFoundView.spec.ts',
    ],
    plugins: { vitest: pluginVitest },
    rules: {
      'vitest/valid-title': [
        'error',
        {
          mustMatch: {
            describe: [
              '^(?!它應該)',
              'describe 寫被測對象（元件、函式或情境），「它應該…」留給 it／test',
            ],
            it: ['^它應該', 'it 的說明要以「它應該」開頭（見 AGENTS.md「測試」）'],
            test: ['^它應該', 'test 的說明要以「它應該」開頭（見 AGENTS.md「測試」）'],
          },
        },
      ],
    },
  },

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,
)
