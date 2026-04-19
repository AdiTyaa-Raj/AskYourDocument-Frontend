'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tenantsService } from '@/services/api/tenants.service'
import { AppFeedbackState } from '@/components/shared/AppFeedbackState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import notify from '@/lib/notifications'

const tenantKeys = {
  all: ['tenants'] as const,
  list: (skip: number, limit: number) => [...tenantKeys.all, { skip, limit }] as const,
}

export function TenantsAdminContainer() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [superuserName, setSuperuserName] = useState('')
  const [superuserEmail, setSuperuserEmail] = useState('')
  const [isActive, setIsActive] = useState(true)

  const skip = 0
  const limit = 50

  const { data, isLoading, error } = useQuery({
    queryKey: tenantKeys.list(skip, limit),
    queryFn: () => tenantsService.listTenants(skip, limit),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      tenantsService.createTenant({
        name: name.trim(),
        slug: slug.trim() || undefined,
        superuser_name: superuserName.trim() || undefined,
        superuser_email: superuserEmail.trim() || undefined,
        is_active: isActive,
      }),
    onSuccess: async () => {
      notify.success({
        title: 'Tenant created',
        description: 'Tenant has been created successfully.',
      })
      setName('')
      setSlug('')
      setSuperuserName('')
      setSuperuserEmail('')
      setIsActive(true)
      await queryClient.invalidateQueries({ queryKey: tenantKeys.all })
    },
    onError: (err) => {
      const description =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Unable to create tenant. Please try again.'
      notify.error({ title: 'Create failed', description })
    },
  })

  const tenants = data?.tenants ?? []
  const total = data?.total ?? tenants.length

  const canCreate = useMemo(
    () => name.trim().length > 0 && !createMutation.isPending,
    [name, createMutation.isPending]
  )

  return (
    <div className="space-y-6">
      <div className="border-border/50 bg-card/50 space-y-4 rounded-xl border p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold">Tenants</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create and manage tenants (super admin only).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tenant-name">Name</Label>
            <Input
              id="tenant-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-slug">Slug (optional)</Label>
            <Input
              id="tenant-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="acme-inc"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-superuser-name">Superuser name (optional)</Label>
            <Input
              id="tenant-superuser-name"
              value={superuserName}
              onChange={(e) => setSuperuserName(e.target.value)}
              placeholder="Admin User"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-superuser-email">Superuser email (optional)</Label>
            <Input
              id="tenant-superuser-email"
              value={superuserEmail}
              onChange={(e) => setSuperuserEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3 md:col-span-2">
            <div>
              <div className="text-sm font-medium">Active</div>
              <div className="text-muted-foreground text-xs">
                Disable to prevent new logins for this tenant.
              </div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button onClick={() => createMutation.mutate()} disabled={!canCreate}>
            {createMutation.isPending ? 'Creating…' : 'Create tenant'}
          </Button>
        </div>
      </div>

      <div className="border-border/50 bg-card/50 rounded-xl border p-6 shadow-sm">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">All tenants</h2>
            <p className="text-muted-foreground text-xs">{total} total</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading tenants…</div>
        ) : error ? (
          <AppFeedbackState
            title="Unable to load tenants"
            description="Your account may not have access to this page."
            variant="error"
          />
        ) : tenants.length === 0 ? (
          <AppFeedbackState
            variant="empty"
            title="No tenants yet"
            description="Create your first tenant above."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Superuser</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.id}</TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="font-mono text-xs">{t.slug}</TableCell>
                    <TableCell className="text-xs">
                      {t.superuser_email ? (
                        <div>
                          <div className="font-medium">{t.superuser_name ?? '—'}</div>
                          <div className="text-muted-foreground">{t.superuser_email}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{t.is_active ? 'Active' : 'Disabled'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
