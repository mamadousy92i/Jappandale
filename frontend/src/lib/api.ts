const API_BASE = "/api"

export class ApiError extends Error {
  status: number
  details: Record<string, string[]> | null

  constructor(status: number, message: string, details: Record<string, string[]> | null = null) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

export async function apiFetch(path: string, options?: RequestInit): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  })
  if (!response.ok) {
    let details: Record<string, string[]> | null = null
    try {
      details = (await response.json()) as Record<string, string[]>
    } catch {
      details = null
    }
    throw new ApiError(response.status, `Erreur API ${response.status}`, details)
  }
  if (response.status === 204) return null
  return response.json()
}
