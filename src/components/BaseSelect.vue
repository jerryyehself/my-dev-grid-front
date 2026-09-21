<script lang="ts">
// 型別放在一般的 <script> 區塊,不是 <script setup>——`<script setup>` 不允許
// `export`,把 interface 寫在裡面編譯會直接失敗。兩個區塊並存是 SFC 支援的寫法,
// 也比為了一個型別另外開一支 .ts 檔輕。
export interface SelectOption {
  value: number
  label: string
  /** 右側的灰字補充,例如分類號。放在 option 裡是因為原生 select 不能放兩段樣式。 */
  suffix?: string
}
</script>

<script setup lang="ts">
// 下拉選單。規格「本體論編輯規格」的缺口 G2 要的東西——**全站在此之前沒有任何
// select 元件**,文章編輯頁的分類號選單是自己刻的一組按鈕,不是下拉。
//
// **為什麼是原生 `<select>` 而不是自己刻一個:** 規格對 G2 的原話是「最小可行做法是
// 一個只列頂層的下拉」。頂層 scope 只有三個(Documentation / Technique /
// Implementation),自訂下拉要補的鍵盤操作、焦點陷阱、行動裝置行為,原生全部免費,
// 而換來的只是樣式自由度——那不是這個欄位需要的東西。真的長出「要搜尋、要分群、
// 要多選」的需求再說,那時候是另一個元件,不是這個的 variant。
//
// **為什麼 value 限定 number:** 這個站上的下拉目前全都是「挑一筆資料的 id」
// (父 scope,以及規格第 8 步的述詞主詞/受詞)。開成泛型或 string|number 是在
// 服務一個還不存在的呼叫端——`BaseField`/`BaseTextarea` 各自只有一個使用點
// 這件事(規格 §02)已經示範過提早抽象的代價。
//
// 樣式刻意跟 BaseInput 的 default variant 對齊(同樣的框線、圓角、內距、字級),
// 因為它們會並排出現在同一張表單裡,對不齊一眼就看得出來。
import BaseHint from './BaseHint.vue'

withDefaults(
  defineProps<{
    options: SelectOption[]
    /** 還沒選時顯示的那一列。選了之後它仍然留著,因為這個欄位是必填,清空要走驗證而不是偷偷消失。 */
    placeholder?: string
    disabled?: boolean
  }>(),
  { placeholder: '請選擇', disabled: false },
)

/** null = 還沒選。用 null 不用 0,因為 0 是合法的 id 值域邊界,分不出「沒選」跟「選了第 0 筆」。 */
const model = defineModel<number | null>({ required: true })
</script>

<template>
  <div class="relative flex min-w-0 flex-col">
    <select
      v-model="model"
      :disabled="disabled"
      class="w-full appearance-none rounded-[6px] border border-(--border-shelf) bg-(--bg-paper-light) py-2.5 pr-9 pl-3 text-sm leading-[1.6] text-(--text-ink-main) focus:border-(--text-accent) focus:shadow-[0_0_0_3px_var(--focus-ring)] focus:outline-none disabled:pointer-events-none disabled:opacity-40"
    >
      <!-- `:value="null"` 而不是空字串:v-model 綁的是 number | null,空字串會讓
           未選狀態變成 ''、型別跟送出的 payload 都對不上。 -->
      <option :value="null" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}<template v-if="option.suffix"> · {{ option.suffix }}</template>
      </option>
    </select>

    <!-- 自己畫箭頭,因為 appearance-none 把原生那個一起拿掉了。aria-hidden:
         它純粹是裝飾,select 本身已經被輔助技術正確識別成下拉。 -->
    <BaseHint
      aria-hidden="true"
      class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
      >▾</BaseHint
    >
  </div>
</template>
