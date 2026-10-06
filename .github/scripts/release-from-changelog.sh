#!/usr/bin/env bash
# 依 CHANGELOG.md 補建 git tag 與 GitHub Release（D-107）。
#
# 規則：
#   - 已上線版本 = 標題完全符合 `## [X.Y.Z] - YYYY-MM-DD` 的段落；
#     日期還是「待上線」或其他非日期文字的段落不算，跳過。
#   - 每個還沒有 tag `vX.Y.Z` 的已上線版本，目標 commit 取 HEAD first-parent 歷史上
#     「最早讓 CHANGELOG.md 出現這一行標題」的那個 commit
#     （main 是 squash merge 的線性歷史，等於該版本上線的那個 release PR）。
#   - Release notes = 該版本段落內容（標題之後，到下一個 `## [` 標題
#     或第一行 `[x.y.z]: ` 連結參照為止），去掉頭尾空行。
#   - 依 semver 由小到大建立；只有 CHANGELOG 裡最高的已上線版本標成 latest。
#   - 已經有 tag 的版本直接跳過，所以重跑不會重複建立（idempotent）。
#
# 用法：
#   DRY_RUN=1 .github/scripts/release-from-changelog.sh   # 只印出計畫，不呼叫 gh
#   GH_TOKEN=... .github/scripts/release-from-changelog.sh # CI 實際建立
#
# 需要完整歷史（actions/checkout 要 fetch-depth: 0），否則找不到目標 commit。

set -euo pipefail

DRY_RUN="${DRY_RUN:-0}"
CHANGELOG="${CHANGELOG:-CHANGELOG.md}"

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if [[ "$(git rev-parse --is-shallow-repository)" == "true" ]]; then
  echo "錯誤：目前是 shallow clone，找不到完整的 first-parent 歷史；請用 fetch-depth: 0。" >&2
  exit 1
fi

if [[ ! -f "$CHANGELOG" ]]; then
  echo "錯誤：找不到 $CHANGELOG" >&2
  exit 1
fi

# 讀 HEAD 上的版本（不是工作目錄裡可能沒 commit 的改動）
changelog_text="$(git show "HEAD:$CHANGELOG")"

heading_re='^## \[([0-9]+\.[0-9]+\.[0-9]+)\] - ([0-9]{4}-[0-9]{2}-[0-9]{2})$'

# 收集已上線版本：「版本<TAB>日期<TAB>完整標題行」
released=()
while IFS= read -r line; do
  if [[ "$line" =~ $heading_re ]]; then
    released+=("${BASH_REMATCH[1]}"$'\t'"${BASH_REMATCH[2]}"$'\t'"$line")
  fi
done <<<"$changelog_text"

if [[ ${#released[@]} -eq 0 ]]; then
  echo "CHANGELOG 裡沒有已上線（有日期）的版本，不需要建立 Release。"
  exit 0
fi

# 依 semver 由小到大排序
mapfile -t released < <(printf '%s\n' "${released[@]}" | sort -t. -k1,1n -k2,2n -k3,3n)

highest_version="$(printf '%s\n' "${released[@]}" | tail -n1 | cut -f1)"

# 已存在的 tag：遠端為準（本機 clone 可能沒抓 tag），再加上本機 tag
existing_tags="$(
  {
    git ls-remote --tags --refs origin 2>/dev/null | sed -E 's#^.*refs/tags/##' || true
    git tag -l
  } | sort -u
)"

tag_exists() {
  grep -qxF -- "$1" <<<"$existing_tags"
}

# 取出某版本的段落內容（標題下一行起，到下一個 `## [` 標題或連結參照行為止），去掉頭尾空行
extract_notes() {
  local heading="$1"
  awk -v heading="$heading" '
    found && (/^## \[/ || /^\[[0-9]+\.[0-9]+\.[0-9]+\]: /) { exit }
    found {
      lines[++n] = $0
      if ($0 ~ /[^[:space:]]/) { if (!first) first = n; last = n }
    }
    $0 == heading { found = 1 }
    END { for (i = first; first && i <= last; i++) print lines[i] }
  ' <<<"$changelog_text"
}

notes_dir="$(mktemp -d)"
trap 'rm -rf "$notes_dir"' EXIT

planned=0
for entry in "${released[@]}"; do
  IFS=$'\t' read -r version date heading <<<"$entry"
  tag="v$version"

  if tag_exists "$tag"; then
    echo "略過 $tag：tag 已存在。"
    continue
  fi

  # 最早讓這一行標題出現在 CHANGELOG.md 的 first-parent commit。
  # -S 是字面字串比對（不是 regex），算的是該字串出現次數有變的 commit；
  # --diff-merges=first-parent 讓 merge commit 也跟第一個 parent 比，
  # 這樣 first-parent 線上用 merge commit 帶進來的標題也找得到。
  target="$(
    git log --first-parent --diff-merges=first-parent --reverse --format=%H \
      -S "$heading" HEAD -- "$CHANGELOG" | head -n1
  )"
  if [[ -z "$target" ]]; then
    echo "錯誤：在 HEAD 的 first-parent 歷史上找不到加入「$heading」的 commit。" >&2
    exit 1
  fi

  notes_file="$notes_dir/$tag.md"
  extract_notes "$heading" >"$notes_file"
  if [[ ! -s "$notes_file" ]]; then
    echo "錯誤：$tag 的 CHANGELOG 段落是空的。" >&2
    exit 1
  fi

  title="$tag（$date）"
  if [[ "$version" == "$highest_version" ]]; then
    latest_flag="--latest"
  else
    latest_flag="--latest=false"
  fi

  planned=$((planned + 1))
  echo "計畫：$tag → $target（$(git log -1 --format=%s "$target")）"
  echo "  title: $title"
  echo "  flag:  $latest_flag"

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "  notes:"
    sed -e 's/^/    | /' "$notes_file"
    echo "  [DRY_RUN] gh release create $tag --target $target --title \"$title\" --notes-file <notes> $latest_flag"
  else
    gh release create "$tag" \
      --target "$target" \
      --title "$title" \
      --notes-file "$notes_file" \
      "$latest_flag"
    echo "  已建立 $tag"
  fi
done

if [[ $planned -eq 0 ]]; then
  echo "所有已上線版本都已有 tag，沒有要建立的 Release。"
fi
