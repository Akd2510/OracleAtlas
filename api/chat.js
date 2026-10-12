export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST for chat requests." });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Gemini is not configured. Add GEMINI_API_KEY in Vercel Environment Variables and redeploy." });
  try {
    const body = req.body || {};
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 8000) : "";
    if (!message) return res.status(400).json({ error: "Please enter a question." });
    const systemInstruction = `You are Atlas, an independent Oracle ERP learning tutor, not official Oracle support. The learner may be a complete beginner. Explain using plain English and short memorable examples, then give the professional meaning and a practical next step. Define acronyms. Teach business process before navigation: business need → process → data/setup → transaction → accounting/controls → validation/reporting. For Oracle Fusion-specific details, clearly distinguish general principles from release-, role-, and tenant-specific behavior. Never invent exact menu paths, product behavior, error causes, or access. For troubleshooting, ask for the exact error text and context where needed; offer safe diagnostic steps and recommend validating changes in a test environment. Avoid confidential data. When asked to quiz, ask one question at a time unless asked otherwise. Structure answers with concise headings and steps.`;
    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
    const contents = [];
    for (const item of history) {
      if (!item || typeof item.content !== "string") continue;
      const role = item.role === "assistant" ? "model" : "user";
      const content = item.content.trim().slice(0, 6000);
      if (!content) continue;
      // Gemini requires alternating roles. Skip duplicate current message, appended below.
      if (role === "user" && content === message && item === history[history.length - 1]) continue;
      const previous = contents[contents.length - 1];
      if (previous && previous.role === role) previous.parts[0].text += "\n\n" + content;
      else contents.push({ role, parts: [{ text: content }] });
    }
    if (!contents.length || contents[contents.length - 1].role !== "user" || contents[contents.length - 1].parts[0].text !== message) {
      contents.push({ role: "user", parts: [{ text: message }] });
    }
    const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: systemInstruction }] }, contents, generationConfig: { temperature: 0.45, maxOutputTokens: 1400 } })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const detail = data?.error?.message || `HTTP ${upstream.status}`;
      console.error("Gemini API error:", detail);
      if (upstream.status === 400 || upstream.status === 404) return res.status(502).json({ error: "Gemini rejected the request or model. Check GEMINI_MODEL and choose a model available to your API key. See Vercel function logs." });
      if (upstream.status === 401 || upstream.status === 403) return res.status(502).json({ error: "Gemini rejected the API key or its permissions. Check GEMINI_API_KEY in Vercel." });
      if (upstream.status === 429) return res.status(429).json({ error: "Gemini rate limit or quota reached. Check Google AI Studio usage and try again later." });
      return res.status(502).json({ error: "Gemini could not complete the request. Check Vercel function logs and Google AI Studio usage." });
    }
    const answer = (data?.candidates?.[0]?.content?.parts || []).map(p => typeof p.text === "string" ? p.text : "").join("\n").trim();
    if (!answer) return res.status(502).json({ error: "Gemini returned no text. Try again or review the prompt." });
    return res.status(200).json({ answer });
  } catch (err) {
    console.error("Atlas Gemini route error:", err);
    return res.status(500).json({ error: "Unexpected server error while contacting Gemini." });
  }
}
