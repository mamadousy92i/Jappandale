const API_BASE = "/api";

let csrfTokenRequest: Promise<string> | null = null;

async function csrfToken(): Promise<string> {
  if (!csrfTokenRequest) {
    csrfTokenRequest = fetch(`${API_BASE}/auth/csrf/`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Impossible d’initialiser la protection CSRF.");
        }
        const data = (await response.json()) as { csrf_token?: string };
        if (!data.csrf_token) {
          throw new Error("Le serveur n’a pas fourni de jeton CSRF.");
        }
        return data.csrf_token;
      })
      .catch((error) => {
        csrfTokenRequest = null;
        throw error;
      });
  }
  return csrfTokenRequest;
}

export class ApiError extends Error {
  status: number;
  details: Record<string, string[]> | null;

  constructor(
    status: number,
    message: string,
    details: Record<string, string[]> | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiFetch(
  path: string,
  options?: RequestInit,
): Promise<unknown> {
  // Pour un envoi multipart (FormData), on laisse le navigateur poser lui-même
  // l'en-tête Content-Type avec la bonne frontière (« boundary »).
  const isFormData =
    typeof FormData !== "undefined" && options?.body instanceof FormData;
  const baseHeaders: Record<string, string> = isFormData
    ? {}
    : { "Content-Type": "application/json" };
  const method = (options?.method ?? "GET").toUpperCase();
  const csrfHeaders: Record<string, string> = [
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
  ].includes(method)
    ? { "X-CSRFToken": await csrfToken() }
    : {};

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { ...baseHeaders, ...csrfHeaders, ...options?.headers },
  });
  if (!response.ok) {
    let details: Record<string, string[]> | null = null;
    try {
      details = (await response.json()) as Record<string, string[]>;
    } catch {
      details = null;
    }
    throw new ApiError(
      response.status,
      `Erreur API ${response.status}`,
      details,
    );
  }
  if (response.status === 204) return null;
  return response.json();
}
