import type { Role } from '../enums.js'

export interface User {
  id: string
  name: string
  phone: string
  phoneVerified: boolean
  email: string | null
  role: Role
  avatarUrl: string | null
  createdAt: string
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
}

export interface ApiErrorDetail {
  field: string
  issue: string
}

export interface ApiErrorBody {
  code: string
  message: string
  details?: ApiErrorDetail[]
}

export interface ApiErrorResponse {
  error: ApiErrorBody
}

export interface ApiSuccessResponse<T> {
  data: T
}

export interface ApiListResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface AuthTokensResponse {
  user: User
  accessToken: string
}

export interface ListQuery {
  page?: number
  pageSize?: number
  search?: string
  sort?: string
}
