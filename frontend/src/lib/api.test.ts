import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "@/lib/api";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiFetch", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("envoie les cookies sur les requêtes API", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ ok: true }));

    await apiFetch("/health/");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/health/",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("initialise puis transmet le jeton CSRF pour une écriture", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        if (String(input).endsWith("/auth/csrf/")) {
          return jsonResponse({ detail: "ok", csrf_token: "jeton-test" });
        }
        return jsonResponse({ detail: "enregistré" });
      });

    await apiFetch("/auth/token/", {
      method: "POST",
      body: JSON.stringify({}),
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/auth/csrf/", {
      credentials: "include",
    });
    const request = fetchMock.mock.calls[1];
    expect(request[0]).toBe("/api/auth/token/");
    expect(request[1]).toEqual(
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({ "X-CSRFToken": "jeton-test" }),
      }),
    );
  });
});
