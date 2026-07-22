import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch } from "@/lib/api";
import { AuthProvider, useAuth } from "@/lib/auth";
import type { User } from "@/lib/types";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiFetch: vi.fn() };
});

const member: User = {
  id: 1,
  email: "awa@jappandale.sn",
  email_verified: true,
  first_name: "Awa",
  last_name: "Ndiaye",
  role: "CONTRIBUTEUR",
  phone: "",
  avatar: null,
  organization_name: "",
  city: "Dakar",
  bio: "",
  kyc_status: "VALIDE",
};

function Harness() {
  const { user, loading, login, logout, verifyAdminMfa } = useAuth();
  if (loading) return <p>Chargement</p>;
  return (
    <div>
      <p>{user ? user.first_name : "Anonyme"}</p>
      <button onClick={() => void login("awa@jappandale.sn", "secret")}>
        Connexion
      </button>
      <button onClick={() => void verifyAdminMfa("challenge-1", "123456")}>
        Confirmer admin
      </button>
      <button onClick={() => void logout()}>Déconnexion</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("restaure une session existante depuis les cookies", async () => {
    vi.mocked(apiFetch).mockImplementation(async (path) => {
      if (path === "/auth/session/") {
        return { authenticated: true, can_refresh: true };
      }
      return member;
    });
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
    expect(await screen.findByText("Awa")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("/auth/me/");
  });

  it("connecte puis déconnecte sans stocker de jeton dans le navigateur", async () => {
    let authenticated = false;
    vi.mocked(apiFetch).mockImplementation(async (path) => {
      if (path === "/auth/session/") {
        return { authenticated: false, can_refresh: false };
      }
      if (path === "/auth/token/") {
        authenticated = true;
        return { detail: "ok" };
      }
      if (path === "/auth/logout/") {
        authenticated = false;
        return null;
      }
      if (path === "/auth/me/" && authenticated) return member;
      throw new ApiError(401, "Non authentifié");
    });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
    expect(await screen.findByText("Anonyme")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Connexion" }));
    expect(await screen.findByText("Awa")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("/auth/token/", expect.any(Object));

    await act(async () =>
      userEvent.click(screen.getByRole("button", { name: "Déconnexion" })),
    );
    expect(await screen.findByText("Anonyme")).toBeInTheDocument();
  });

  it("finalise la connexion administrateur après le code e-mail", async () => {
    let authenticated = false;
    vi.mocked(apiFetch).mockImplementation(async (path) => {
      if (path === "/auth/session/") {
        return { authenticated: false, can_refresh: false };
      }
      if (path === "/auth/me/" && !authenticated) {
        throw new ApiError(401, "Non authentifié");
      }
      if (path === "/auth/token/mfa/") {
        authenticated = true;
        return { detail: "ok" };
      }
      if (path === "/auth/me/") return { ...member, role: "ADMIN" };
      return null;
    });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
    expect(await screen.findByText("Anonyme")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Confirmer admin" }),
    );
    expect(await screen.findByText("Awa")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith(
      "/auth/token/mfa/",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
