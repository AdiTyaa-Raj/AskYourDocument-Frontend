'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { usersService } from '@/services/api/users.service'
import type { ListedOrgUser } from '@/services/api/users.service'

/** Matches Documents "All Authors" infinite scroll pattern; slightly larger first page than author filter (5). */
const ORG_USERS_PAGE_SIZE = 10

export type OrgUsersPage = { users: ListedOrgUser[]; total: number }

const orgUsersKeys = {
  all: ['org-users'] as const,
  infinite: (pageSize: number) => [...orgUsersKeys.all, 'infinite', pageSize] as const,
}

/**
 * Paginated org directory (GET /users/?skip=&limit=) for multi-select user pickers.
 * Use scroll sentinel + fetchNextPage like Documents "All Authors".
 */
export function useOrgUsersInfinite(enabled: boolean) {
  const pageSize = ORG_USERS_PAGE_SIZE
  return useInfiniteQuery<OrgUsersPage, Error>({
    queryKey: orgUsersKeys.infinite(pageSize),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const skip = pageParam as number
      const { users, total } = await usersService.listUsers(skip, pageSize)
      return { users, total }
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce((acc, p) => acc + p.users.length, 0)
      if (lastPage.users.length === 0 || totalLoaded >= lastPage.total) {
        return undefined
      }
      return totalLoaded
    },
    enabled,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  })
}
