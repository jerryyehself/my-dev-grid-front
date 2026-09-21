<script setup lang="ts">
// 多行輸入框。跟 BaseInput 同一個理由抽出來——焦點樣式只該定義一次。
// resize-y:允許使用者自己拉高,但不允許拉寬,拉寬會撐破格線版面。
//
// `limit` 是規格「本體論編輯規格」的缺口 G3。
//
// **為什麼字數放在這裡,不放在 BaseField 的 hint:** hint 收的是字串,而且是靜態的,
// 要即時字數就得讓每個呼叫端自己算一份 computed 再傳進來——那不只是重複,
// 而是「逼近上限要看得出來」這件事會散在呼叫端,每個人各自決定幾 % 算逼近、
// 變成什麼顏色。值的擁有者是這個元件（`model` 在這裡）,所以計數也該在這裡。
//
// **這是 BaseTextarea 的第二個使用情境**(規格 §02 說的「第一次真正驗證這個抽象」)。
// 驗證結果:抽象站得住,但**多了一層外框,所以要自己處理 attrs 落點**——既有的四個
// 呼叫端都傳了 `class`(`text-sm leading-7`、`font-serif` 這種字體覆寫),那些 class
// 本來直接落在 textarea 上。不處理的話它們會落到外層 div,文字樣式全部失效,
// 而且畫面不會報錯,只是字級悄悄變了。inheritAttrs:false + v-bind="$attrs" 綁回
// textarea 是為了這個,不是樣板噪音。
//
// **刻意不設原生 `maxlength`:** 後端 `comment` 是 `max:100`,超過回 422。原生
// maxlength 會讓使用者打到第 100 個字就無聲地打不進去——貼上一段 120 字的說明時
// 會被默默截斷成 100,而且不會有任何提示。寧可讓他打超過、看見超出的量,
// 自己決定要刪哪裡。這是 Norman 講的「讓錯誤看得見且可復原」,不是「讓錯誤不可能發生」。
import { computed } from 'vue'
import BaseHint from './BaseHint.vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{ rows?: number; limit?: number }>(), {
  rows: 3,
  limit: undefined,
})
const model = defineModel<string>({ required: true })

/**
 * 用展開運算子數長度,不是 `.length`。
 *
 * `'字'.length` 對 BMP 內的中文是 1,但 emoji 與擴展漢字(U+20000 以上,這個專案的
 * 內容真的可能出現)是 2 個 UTF-16 code unit,`.length` 會多算一倍。後端 Laravel 的
 * `max:100` 走 `mb_strlen`,數的是字元數——兩邊要一致,不然畫面顯示 98/100
 * 而後端回 422,使用者完全看不出哪裡錯了。
 */
const used = computed(() => [...model.value].length)

const over = computed(() => props.limit !== undefined && used.value > props.limit)

/** 逼近上限 = 還剩不到一成。門檻收在元件裡,不讓呼叫端各自決定。 */
const near = computed(
  () => props.limit !== undefined && !over.value && used.value > props.limit * 0.9,
)
</script>

<template>
  <div class="flex min-w-0 flex-col gap-1">
    <textarea
      v-bind="$attrs"
      v-model="model"
      :rows="rows"
      :aria-invalid="over || undefined"
      class="rounded-[5px] border bg-(--bg-folder) px-3 py-2.5 text-sm leading-[1.6] text-(--text-ink-body) placeholder:text-(--text-ink-muted) placeholder:opacity-55 focus:shadow-[0_0_0_3px_var(--focus-ring)] focus:outline-none resize-y"
      :class="
        over ? 'border-(--text-accent)' : 'border-(--border-shelf) focus:border-(--text-accent)'
      "
    ></textarea>

    <!-- 超出上限用的是 `--text-accent`,不是新開一個紅色 token。站上沒有 danger/error
         色票,既有的錯誤語彙就是強調色(見 BaseLoadingBlock 的 tone="error")。
         為了讓「逼近」跟「已超出」不只差在顏色——那兩者同色會分不出來——超出時
         另外加粗並直接寫出超出幾個字,靠的是字重加文字,不是再發明一個顏色。

         aria-live="polite":超出上限是**已經發生**的錯誤,讀螢幕的人要在打字當下
         知道,不是等按下儲存才從錯誤訊息裡發現。用 polite 而不是 assertive,
         因為每打一個字都插播會吵到無法輸入。 -->
    <div v-if="limit !== undefined" class="flex justify-end" aria-live="polite">
      <BaseHint v-if="!over && !near" dim>{{ used }} / {{ limit }}</BaseHint>
      <span
        v-else
        class="font-mono text-[10px] tracking-[0.12em] text-(--text-accent)"
        :class="over && 'font-bold'"
      >
        {{ used }} / {{ limit }}<template v-if="over"> · 超出 {{ used - limit }} 字</template>
      </span>
    </div>
  </div>
</template>
