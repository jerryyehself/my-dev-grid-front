import { describe, expect, it } from 'vitest'
import { typeCentroids, typeClusterForce } from './clusterForce'

type T = 'documentation' | 'technique' | 'implementation'
const mk = (x: number, y: number, domainType: T) => ({ x, y, vx: 0, vy: 0, domainType })

describe('typeClusterForce', () => {
  it('節點往自己類別的重心拉，不往別的類別拉', () => {
    const nodes = [mk(0, 0, 'documentation'), mk(10, 0, 'documentation'), mk(100, 100, 'technique')]
    const f = typeClusterForce(() => 0.1)
    f.initialize(nodes)
    f(1)
    expect(nodes[0]!.vx).toBeCloseTo(0.5)
    expect(nodes[1]!.vx).toBeCloseTo(-0.5)
    // 單獨一個節點就是自己的重心，不受力
    expect(nodes[2]!.vx).toBe(0)
    expect(nodes[2]!.vy).toBe(0)
  })

  it('同一類別的拉力加總為零：不會讓整張圖漂移', () => {
    const nodes = [mk(0, 0, 'implementation'), mk(30, 5, 'implementation'), mk(-7, 40, 'implementation')]
    const f = typeClusterForce(() => 0.08)
    f.initialize(nodes)
    f(0.7)
    expect(nodes.reduce((s, n) => s + n.vx, 0)).toBeCloseTo(0)
    expect(nodes.reduce((s, n) => s + n.vy, 0)).toBeCloseTo(0)
  })

  it('強度 0 等於關掉', () => {
    const nodes = [mk(0, 0, 'technique'), mk(10, 0, 'technique')]
    const f = typeClusterForce(() => 0)
    f.initialize(nodes)
    f(1)
    expect(nodes[0]!.vx).toBe(0)
  })

  it('typeCentroids 依類別算平均座標', () => {
    const c = typeCentroids([mk(0, 0, 'technique'), mk(4, 2, 'technique')])
    expect(c.get('technique')).toEqual({ x: 2, y: 1 })
  })
})
