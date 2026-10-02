// 鏡頭操作的座標換算（D-87）：滾輪縮放、兩指縮放都要「手指／游標底下那一點縮放後還在原處」。
//
// force-graph 的鏡頭用「畫面中心對準哪個世界座標（centerAt）＋縮放倍率（zoom）」描述。
// 世界座標 p 在螢幕上的位置 = (p − center) × k + 畫面尺寸 / 2，反過來解出 center 即可。

export interface Point {
  x: number
  y: number
}

export const MIN_ZOOM = 0.2
export const MAX_ZOOM = 8

export function clampZoom(k: number, min = MIN_ZOOM, max = MAX_ZOOM): number {
  return Math.min(max, Math.max(min, k))
}

/** 要讓世界座標 world 出現在螢幕位置 screen（相對畫布左上角），縮放 k 時畫面中心該對準哪裡 */
export function centerForAnchor(
  world: Point,
  screen: Point,
  k: number,
  viewW: number,
  viewH: number,
): Point {
  return { x: world.x - (screen.x - viewW / 2) / k, y: world.y - (screen.y - viewH / 2) / k }
}

/**
 * 滾輪量換成縮放倍數。沿用 d3-zoom 的換算（像素模式 0.002／行模式 0.05），但不像 d3-zoom
 * 在按住 Ctrl 時再乘 10——那是為了觸控板雙指捏合設計的，滑鼠滾輪一格（deltaY≈100）會
 * 直接縮放 4 倍。觸控板捏合本來就是很多個小 delta，不乘也夠順。
 */
export function wheelZoomFactor(deltaY: number, deltaMode: number): number {
  const delta = -deltaY * (deltaMode === 1 ? 0.05 : deltaMode ? 1 : 0.002)
  return 2 ** delta
}

export interface PinchStart {
  /** 兩指中點底下的世界座標 */
  world: Point
  /** 開始時兩指距離（螢幕像素） */
  dist: number
  k: number
}

/** 兩指移動／縮放：中點底下的世界座標跟著手指走，倍率依兩指距離變化 */
export function pinchView(
  start: PinchStart,
  mid: Point,
  dist: number,
  viewW: number,
  viewH: number,
): { k: number; center: Point } {
  const k = clampZoom(start.k * (start.dist > 0 ? dist / start.dist : 1))
  return { k, center: centerForAnchor(start.world, mid, k, viewW, viewH) }
}

export function isMacLike(): boolean {
  if (typeof navigator === 'undefined') return false
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    ''
  return /mac|iphone|ipad|ipod/i.test(platform) || /Mac OS X/.test(navigator.userAgent)
}
