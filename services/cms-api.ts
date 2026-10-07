interface ApiError {
  error?: string;
}

export async function cmsRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    const headers = new Headers(options.headers);
    if (options.body && !isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    response = await fetch(path, {
      ...options,
      cache: "no-store",
      headers,
    });
  } catch {
    throw new Error("Could not reach the Roar CMS API.");
  }

  let payload: T & ApiError;
  try {
    payload = (await response.json()) as T & ApiError;
  } catch {
    throw new Error("The CMS API returned an invalid response.");
  }
  if (!response.ok) {
    throw new Error(payload.error ?? `The API returned HTTP ${response.status}.`);
  }

  return payload;
}
