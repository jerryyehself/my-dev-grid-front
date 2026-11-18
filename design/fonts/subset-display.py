#!/usr/bin/env python3
"""展示字 Cactus Classical Serif 的子集化腳本。

只收三處用到的字：首頁大標、404 大標、關於頁職稱。這些字串改了，要重跑這支再提交新的 woff2。
用法：python3 design/fonts/subset-display.py <原始 CactusClassicalSerif-Regular.ttf>
需要：pip install fonttools brotli
原始字型：Google Fonts（google/fonts 的 ofl/cactusclassicalserif），授權 SIL OFL 1.1。
"""
import sys
from fontTools import subset

TEXTS = [
    "一位圖資背景後端工程師的工作心智模式",  # HomeView.vue 的 H1
    "找不到這個頁面",  # NotFoundView.vue 的 H1
    "圖書資訊學出身，兩年程式教學、三年後端工程師。習慣先替東西分類、找出彼此的關係，再寫成程式。",  # AboutView.vue 的 CAREER_PHRASES
]
OUT = "src/assets/fonts/CactusClassicalSerif-display.woff2"

src = sys.argv[1]
chars = "".join(sorted(set("".join(TEXTS))))
opts = subset.Options()
opts.flavor = "woff2"
opts.layout_features = []  # 只收中文字，不需要字形替換
opts.hinting = False
opts.drop_tables += ["vhea", "vmtx", "BASE", "GSUB", "GPOS"]  # 橫排用不到
opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]  # 保留版權與授權名稱欄
opts.notdef_outline = True
font = subset.load_font(src, opts)
sub = subset.Subsetter(opts)
sub.populate(text=chars)
sub.subset(font)
subset.save_font(font, OUT, opts)
print(f"{len(chars)} 個字 -> {OUT}")
