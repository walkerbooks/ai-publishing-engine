export async function postJson<T>(
  url: string,
  body: unknown,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...init?.headers },
    body: JSON.stringify(body),
    ...init,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}
