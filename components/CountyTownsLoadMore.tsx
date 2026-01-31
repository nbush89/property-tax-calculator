'use client'

import { useEffect, useState } from 'react'

/**
 * "Load more" for county towns list. Shows first pageSize items; button reveals next pageSize.
 * All town links remain in the DOM for SEO.
 */
export default function CountyTownsLoadMore({
  listId,
  totalCount,
  pageSize = 20,
}: {
  listId: string
  totalCount: number
  pageSize?: number
}) {
  const [visibleCount, setVisibleCount] = useState(pageSize)

  useEffect(() => {
    const list = document.getElementById(listId)
    if (!list) return
    const items = Array.from(list.querySelectorAll<HTMLElement>('[data-town-card]'))
    items.forEach((el, i) => {
      const idx = parseInt(el.getAttribute('data-town-index') ?? String(i), 10)
      ;(el as HTMLElement).style.display = idx < visibleCount ? '' : 'none'
    })
  }, [listId, visibleCount])

  if (totalCount <= pageSize) return null

  const hasMore = visibleCount < totalCount

  return (
    <div className="mt-6 flex justify-center">
      <button
        type="button"
        onClick={() => setVisibleCount(c => Math.min(c + pageSize, totalCount))}
        disabled={!hasMore}
        className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Load more towns"
      >
        {hasMore
          ? `Load more (${visibleCount} of ${totalCount} shown)`
          : `All ${totalCount} towns shown`}
      </button>
    </div>
  )
}
