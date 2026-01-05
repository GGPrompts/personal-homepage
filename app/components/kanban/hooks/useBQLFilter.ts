'use client'

import { useMemo } from 'react'
import { Task } from '../types'
import { compileQuery, filterItems, BQLFilter } from '../lib/bql'

/**
 * Hook for BQL query compilation and task filtering
 *
 * @param query - The BQL query string
 * @param tasks - Array of tasks to filter
 * @returns Filtered tasks and validation info
 */
export function useBQLFilter(query: string | undefined, tasks: Task[]) {
  // Compile the query (memoized)
  const filter: BQLFilter = useMemo(() => {
    if (!query?.trim()) {
      return { query: '', ast: undefined, isValid: true }
    }
    return compileQuery(query)
  }, [query])

  // Filter tasks based on compiled query
  const filteredTasks = useMemo(() => {
    if (!filter.isValid || !filter.ast) {
      return tasks
    }
    return filterItems(tasks, filter)
  }, [tasks, filter])

  return {
    filteredTasks,
    isValid: filter.isValid,
    error: filter.error,
    hasQuery: !!query?.trim(),
  }
}

/**
 * Hook for filtering all tasks by column, respecting BQL dynamic columns
 *
 * @param allTasks - All tasks in the board
 * @param columnId - The column ID
 * @param bqlQuery - Optional BQL query for dynamic filtering
 * @param isDynamic - Whether the column uses dynamic BQL filtering
 * @returns Tasks for this column (either by columnId or BQL filter)
 */
export function useColumnTasks(
  allTasks: Task[],
  columnId: string,
  bqlQuery?: string,
  isDynamic?: boolean
) {
  return useMemo(() => {
    // If dynamic column with BQL query, filter all tasks
    if (isDynamic && bqlQuery?.trim()) {
      const filter = compileQuery(bqlQuery)
      if (filter.isValid && filter.ast) {
        return filterItems(allTasks, filter).sort((a, b) => a.order - b.order)
      }
    }

    // Otherwise, return tasks assigned to this column
    return allTasks
      .filter((t) => t.columnId === columnId)
      .sort((a, b) => a.order - b.order)
  }, [allTasks, columnId, bqlQuery, isDynamic])
}
