export async function streamChat(
  messages: { role: string; content: string }[],
  onToken: (token: string) => void,
  signal: AbortSignal
) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!res.ok) {
    let errMsg = "Backend offline or error occurred."
    try {
      const errJson = await res.json()
      errMsg = errJson.error || errMsg
    } catch {
      // Not JSON — use status text
      errMsg = `Backend returned ${res.status}: ${res.statusText}`
    }
    throw new Error(errMsg)
  }

  if (!res.body) {
    throw new Error("No response body stream received.")
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    // Keep last (potentially incomplete) line in buffer
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      // ⚠️ Do NOT use line.trim() — it strips trailing spaces that are
      // part of the token text (sentencepiece adds trailing spaces as
      // word separators). Only trimStart to handle any leading whitespace.
      const trimmedStart = line.trimStart()
      if (trimmedStart.startsWith("data: ")) {
        const data = trimmedStart.slice(6)
        if (data === "[DONE]") return
        if (data.startsWith("[ERROR]")) {
          throw new Error(data.slice(7).trim())
        }
        // Unescape newlines that were escaped in the SSE frame
        const unescaped = data.replace(/\\n/g, "\n")
        if (unescaped) onToken(unescaped)
      }
    }
  }

  // Flush any remaining buffered content
  if (buffer.trimStart().startsWith("data: ")) {
    const data = buffer.trimStart().slice(6)
    if (data && data !== "[DONE]" && !data.startsWith("[ERROR]")) {
      const unescaped = data.replace(/\\n/g, "\n")
      onToken(unescaped)
    }
  }
}

export async function fetchModelStatus(): Promise<string> {
  try {
    const res = await fetch("/api/status", { cache: "no-store" })
    if (!res.ok) return "offline"
    const data = await res.json()
    return data.status || "offline"
  } catch {
    return "offline"
  }
}
