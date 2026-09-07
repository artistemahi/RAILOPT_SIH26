export class PythonServiceError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "PythonServiceError";
  }
}

export async function postJson<TRequest, TResponse>(
  baseUrl: string,
  path: string,
  payload: TRequest,
  timeoutMs = 10_000,
): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const responseBody = await response.json().catch(() => null);
    if (!response.ok) {
      throw new PythonServiceError(
        `Python service returned HTTP ${response.status}`,
        response.status,
      );
    }

    return responseBody as TResponse;
  } catch (error) {
    if (error instanceof PythonServiceError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new PythonServiceError("Python service request timed out", 504);
    }
    throw new PythonServiceError("Python service is unavailable", 502);
  } finally {
    clearTimeout(timeout);
  }
}
