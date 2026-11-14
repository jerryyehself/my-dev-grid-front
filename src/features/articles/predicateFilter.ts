interface Predicate {
  subject_id: number | null
  object_id: number | null
}

interface Scope {
  id: number
  parent_class: number | null
}

/** 文章固定是主詞；分類必須沿父鏈符合，且整條鏈不能有環。 */
export function filterPredicates<T extends Predicate>(
  predicates: readonly T[],
  scopes: readonly Scope[],
  subjectScopeId: number | null | undefined,
  objectScopeId: number | null | undefined,
): T[] {
  const parents = new Map(scopes.map((scope) => [scope.id, scope.parent_class]))
  function ancestors(id: number | null | undefined): Set<number> | null {
    const visited = new Set<number>()
    while (id !== null && id !== undefined) {
      if (visited.has(id) || !parents.has(id)) return null
      visited.add(id)
      id = parents.get(id)
    }
    return visited
  }
  // 即使途中找到要求的分類，也先走完整條鏈，避免讓環裡的分類被當成合法祖先。
  const subject = ancestors(subjectScopeId)
  const object = ancestors(objectScopeId)
  return predicates.filter((predicate) =>
    predicate.subject_id !== null && predicate.object_id !== null &&
    subject?.has(predicate.subject_id) && object?.has(predicate.object_id),
  )
}
