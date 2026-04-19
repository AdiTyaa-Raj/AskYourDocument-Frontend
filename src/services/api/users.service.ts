import { BaseApiService } from './base'

// ─────────────────────────────────────────────────────────────────────────────
// Backend-aligned types (AskYourDocument)
// ─────────────────────────────────────────────────────────────────────────────

export interface BackendUserSummary {
  id: number
  tenant_id: number
  email: string
  full_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BackendUserListResponse {
  total: number
  skip: number
  limit: number
  users: BackendUserSummary[]
}

export interface UserRecordApi {
  User: {
    id: number
    email?: string | null
    full_name?: string | null
    username?: string | null
    is_active?: boolean
    is_superuser?: boolean
    created_at?: string
    updated_at?: string
  }
  UserRole?: {
    role_id?: number | null
    org_id?: number | null
    id?: number | null
    created_at?: string
    updated_at?: string
  } | null
  Role?: {
    id?: number | null
    name?: string | null
    description?: string | null
    org_id?: number | null
    is_active?: boolean
    created_at?: string
    updated_at?: string
  } | null
}

export type UserSearchResponse = [UserRecordApi[], number]

export interface UserDirectoryEntry {
  id: number
  fullName: string
  email?: string
  roleName?: string
  roleLabel?: string
}

export type UserDirectoryMap = Record<number, UserDirectoryEntry>

/** Normalized row for org user lists (e.g. Documents author filter). */
export interface ListedOrgUser {
  id: number
  displayName: string
}

function buildDisplayName(user: UserRecordApi['User']): string {
  if (user.full_name && user.full_name.trim().length) return user.full_name.trim()
  if (user.username && user.username.trim().length) return user.username.trim()
  if (user.email && user.email.trim().length) return user.email.trim()
  return `User ${user.id}`
}

function formatRoleLabel(role?: string | null): string | undefined {
  if (!role) return undefined
  const trimmed = role.trim()
  if (!trimmed) return undefined
  return trimmed
    .toLowerCase()
    .split(/[-_\s]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function mapUsersToDirectory(records: UserRecordApi[]): UserDirectoryMap {
  return records.reduce<UserDirectoryMap>((acc, record) => {
    const user = record.User
    if (!user || typeof user.id !== 'number') {
      return acc
    }
    const roleSlug =
      record.Role?.name ??
      record.Role?.description ??
      record.UserRole?.role_id?.toString() ??
      undefined
    acc[user.id] = {
      id: user.id,
      fullName: buildDisplayName(user),
      email: user.email ?? undefined,
      roleName: roleSlug ?? undefined,
      roleLabel: formatRoleLabel(roleSlug),
    }
    return acc
  }, {})
}

function coerceUserId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isNaN(parsed)) return parsed
  }
  return undefined
}

function parseListedOrgUser(raw: unknown): ListedOrgUser | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const flatId = coerceUserId(r.id)
  if (flatId !== undefined) {
    const name =
      (typeof r.full_name === 'string' && r.full_name.trim()) ||
      (typeof r.name === 'string' && r.name.trim()) ||
      (typeof r.username === 'string' && r.username.trim()) ||
      (typeof r.email === 'string' && r.email.trim()) ||
      `User ${flatId}`
    return { id: flatId, displayName: name }
  }
  const nested = r.User as UserRecordApi['User'] | undefined
  const nestedId = nested ? coerceUserId(nested.id) : undefined
  if (nested && nestedId !== undefined) {
    return { id: nestedId, displayName: buildDisplayName(nested) }
  }
  return null
}

class UsersService extends BaseApiService {
  async listBackendUsers(skip = 0, limit = 50): Promise<BackendUserListResponse> {
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    })
    return this.get<BackendUserListResponse>(`/users?${params.toString()}`)
  }

  async getUsersByIds(ids: number[]): Promise<UserDirectoryMap> {
    const uniqueIds = Array.from(
      new Set(ids.filter((id): id is number => typeof id === 'number' && Number.isFinite(id)))
    )
    if (!uniqueIds.length) {
      return {}
    }
    // Prefer legacy /search/User (older backends) when available; otherwise fall back
    // to the AskYourDocument backend which exposes only list endpoints.
    try {
      const searchValue = encodeURIComponent(`id__in:${uniqueIds.join(',')}`)
      const endpoint = `/search/User?search=${searchValue}`
      const response = await this.get<UserSearchResponse>(endpoint)
      const [records] = response
      if (!Array.isArray(records) || !records.length) {
        return {}
      }
      return mapUsersToDirectory(records)
    } catch {
      const { users } = await this.listUsers(0, 500)
      const directory: UserDirectoryMap = {}
      for (const u of users) {
        if (!uniqueIds.includes(u.id)) continue
        directory[u.id] = {
          id: u.id,
          fullName: u.displayName,
        }
      }
      return directory
    }
  }

  async getCurrentUser() {
    return this.get<{ id: number; email?: string; full_name?: string; username?: string }>(
      '/users/me'
    )
  }

  /**
   * Paginated organization users (GET /users/?skip=&limit=)
   * Used for filters such as Documents "All Authors".
   */
  async listUsers(skip = 0, limit = 100): Promise<{ users: ListedOrgUser[]; total: number }> {
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    })
    const res = await this.get<
      BackendUserListResponse | { users?: unknown; data?: unknown; total?: number }
    >(`/users?${params.toString()}`)

    const rows =
      typeof res === 'object' &&
      res &&
      'users' in res &&
      Array.isArray((res as BackendUserListResponse).users)
        ? (res as BackendUserListResponse).users
        : Array.isArray((res as { users?: unknown }).users)
          ? (res as { users: unknown[] }).users
          : Array.isArray((res as { data?: unknown }).data)
            ? (res as { data: unknown[] }).data
            : []
    const seen = new Set<number>()
    const users: ListedOrgUser[] = []
    for (const row of rows) {
      const u = parseListedOrgUser(row)
      if (u && !seen.has(u.id)) {
        seen.add(u.id)
        users.push(u)
      }
    }
    const total =
      typeof (res as { total?: unknown }).total === 'number'
        ? (res as { total: number }).total
        : users.length
    return { users, total }
  }
}

export const usersService = new UsersService()
export { mapUsersToDirectory }
