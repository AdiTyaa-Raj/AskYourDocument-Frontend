'use client'

import { useQuery } from '@tanstack/react-query'
import { usersService } from '@/services/api/users.service'
import { AppFeedbackState } from '@/components/shared/AppFeedbackState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const userKeys = {
  all: ['users'] as const,
  list: (skip: number, limit: number) => [...userKeys.all, { skip, limit }] as const,
}

export function UsersAdminContainer() {
  const skip = 0
  const limit = 50

  const { data, isLoading, error } = useQuery({
    queryKey: userKeys.list(skip, limit),
    queryFn: () => usersService.listBackendUsers(skip, limit),
  })

  const users = data?.users ?? []
  const total = data?.total ?? users.length

  return (
    <div className="border-border/50 bg-card/50 rounded-xl border p-6 shadow-sm">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-muted-foreground mt-1 text-sm">Users in your tenant.</p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading users…</div>
      ) : error ? (
        <AppFeedbackState
          title="Unable to load users"
          description="Please try again later."
          variant="error"
        />
      ) : users.length === 0 ? (
        <AppFeedbackState
          variant="empty"
          title="No users found"
          description="No active users are configured."
        />
      ) : (
        <>
          <div className="text-muted-foreground mb-3 text-xs">{total} total</div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs">{u.id}</TableCell>
                    <TableCell className="font-mono text-xs">{u.tenant_id}</TableCell>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-xs">{u.email}</TableCell>
                    <TableCell className="text-xs">{u.is_active ? 'Active' : 'Disabled'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
