import { GO_API_PREFIX, goAuthHeaders } from "@/lib/api/go-api";
import { getLogger } from "@/lib/log";

const log = getLogger("auth-client");

export type AuthUser = {
  public_id: string;
  email: string;
  first_name: string;
  last_name: string;
};

export type AuthResponse = {
  access_token: string;
  user: AuthUser;
};

export type MeResponse = { user: AuthUser };

async function readErrorMessage(res: Response): Promise<string> {
  const t = await res.text();
  try {
    const j = JSON.parse(t) as { error?: string };
    if (j.error) return j.error;
  } catch {
    /* */
  }
  return t || `Request failed: ${res.status}`;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${GO_API_PREFIX}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    log.warning(`login failed: HTTP ${res.status}`);
    throw new Error(await readErrorMessage(res));
  }
  log.debug("login succeeded");
  return res.json() as Promise<AuthResponse>;
}

export async function signup(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<AuthResponse> {
  const res = await fetch(`${GO_API_PREFIX}/v1/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    }),
  });
  if (!res.ok) {
    log.warning(`signup failed: HTTP ${res.status}`);
    throw new Error(await readErrorMessage(res));
  }
  log.debug("signup succeeded");
  return res.json() as Promise<AuthResponse>;
}

export async function fetchAuthMe(accessToken: string): Promise<MeResponse> {
  const res = await fetch(`${GO_API_PREFIX}/v1/auth/me`, {
    headers: goAuthHeaders(accessToken),
  });
  if (!res.ok) {
    log.warning(`auth/me failed: HTTP ${res.status}`);
    throw new Error(await readErrorMessage(res));
  }
  log.debug("auth/me succeeded");
  return res.json() as Promise<MeResponse>;
}
