'use client'

import { useQuery } from '@tanstack/react-query'
import { rolesService } from '@/services/api/roles.service'
import { AppFeedbackState } from '@/components/shared/AppFeedbackState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const roleKeys = {
  all: ['roles'] as const,
  list: (skip: number, limit: number) => [...roleKeys.all, { skip, limit }] as const,
}

export function RolesAdminContainer() {
  const skip = 0
  const limit = 50

  const { data, isLoading, error } = useQuery({
    queryKey: roleKeys.list(skip, limit),
    queryFn: () => rolesService.listRoles(skip, limit),
  })

  const roles = data?.roles ?? []
  const total = data?.total ?? roles.length

  return (
    <div className="border-border/50 bg-card/50 rounded-xl border p-6 shadow-sm">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Roles</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Tenant-scoped roles available in the system.
        </p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading roles…</div>
      ) : error ? (
        <AppFeedbackState
          title="Unable to load roles"
          description="Please try again later."
          variant="error"
        />
      ) : roles.length === 0 ? (
        <AppFeedbackState
          variant="empty"
          title="No roles found"
          description="No roles are configured for your tenant."
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
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell className="font-mono text-xs">{r.tenant_id}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs">{r.description ?? '—'}</TableCell>
                    <TableCell className="text-xs">{r.is_active ? 'Active' : 'Disabled'}</TableCell>
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
