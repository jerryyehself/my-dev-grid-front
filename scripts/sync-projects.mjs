#!/usr/bin/env node
// 從 GitHub 抓真實的公開 repo 列表，重新產生 src/data/projects.ts。
// 這個 repo 目前跑在一個對外網路受限的 sandbox 裡，這支腳本假設在有正常網路的環境執行
// （你自己的機器、或一支 CI）；之後要接真正的後端，可以把這支腳本的抓取/整形邏輯直接搬過去。
//
// 用法：GITHUB_USER=jerryyehself node scripts/sync-projects.mjs
//
// 注意：role 欄位這支腳本不會填，GitHub API 本來就查不到「你在專案裡的角色」這種資訊，
// 每次重跑都會把 src/data/projects.ts 整個覆寫掉——如果之後手動填了 role，記得先備份。

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const GITHUB_USER = process.env.GITHUB_USER || 'jerryyehself'
const OUT_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'projects.ts')

export async function fetchAllPublicRepos(username) {
  const repos = []
  let page = 1
  for (;;) {
    const res = await fetch(
      `https://api.github.com/users/${username}/repos?type=owner&per_page=100&page=${page}`,
      { headers: { Accept: 'application/vnd.github+json' } },
    )
    if (!res.ok) {
      throw new Error(`GitHub API ${res.status}: ${await res.text()}`)
    }
    const batch = await res.json()
    repos.push(...batch)
    if (batch.length < 100) break
    page += 1
  }
  // /users/{username}/repos 未帶認證時本來就只會回公開 repo，這裡再過濾一次求保險
  return repos.filter((r) => !r.private && !r.fork)
}

export function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export function toTsSource(repos) {
  const yearCounters = {}
  const entries = repos.map((r) => {
    const year = r.created_at.slice(0, 4)
    const startedYm = r.created_at.slice(0, 7).replace('-', '.')
    const tags = r.topics?.length ? r.topics : r.language ? [r.language] : []
    const desc = r.description || ''
    const status = r.archived ? 'Archived' : 'Active'
    const statusType = r.archived ? 'archived' : 'active'
    yearCounters[year] = (yearCounters[year] || 0) + 1
    const id = `PROJ-${year}-${String(yearCounters[year]).padStart(2, '0')}`
    const tagsSrc = tags.map((t) => `'${esc(t)}'`).join(', ')
    return `  {
    id: '${id}',
    title: '${esc(r.name)}',
    status: '${status}',
    statusType: '${statusType}',
    desc: '${esc(desc)}',
    tags: [${tagsSrc}],
    started: '${startedYm}',
    repo: '${esc(r.name)}',
  },`
  })

  return `export interface Project {
  id: string
  title: string
  status: string
  statusType: 'active' | 'archived'
  desc: string
  tags: string[]
  started: string
  repo: string
  role?: string
}

// 直接從 GitHub 真實公開 repo 抓來的資料（由 scripts/sync-projects.mjs 產生），不是編出來的示範內容。
// role 先留空——目前這些專案都沒有其他協作者，之後如果有共同開發的專案再補（重跑這支腳本會覆寫掉手動加的 role）。
export const projects: Project[] = [
${entries.join('\n')}
]
`
}

// 只有直接執行這支腳本時才真的打 API、寫檔；被測試 import 時不要跟著跑。
if (import.meta.url === `file://${process.argv[1]}`) {
  const repos = await fetchAllPublicRepos(GITHUB_USER)
  repos.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  writeFileSync(OUT_PATH, toTsSource(repos))
  console.log(`寫入 ${repos.length} 個公開專案到 ${OUT_PATH}`)
}
