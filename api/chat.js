export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST for chat requests." });
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ error: "AI is not configured yet. Add OPENAI_API_KEY in Vercel Environment Variables, then redeploy." });
  try {
    const body = req.body || {};
    const message = typeof body.message === "string" ? body.message.slice(0, 8000) : "";
    if (!message.trim()) return res.status(400).json({ error: "Please enter a question." });
    const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
    const input = history.map(item => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: String(item.content || "").slice(0, 8000)
    }));
    // Keep the current message in the submitted history exactly once.
    if (!input.length || input[input.length - 1].content !== message) input.push({ role: "user", content: message });
    const instructions = `You are Atlas, a patient and rigorous Oracle ERP learning tutor. The learner may be a complete beginner and wants EL5 explanations with memorable, respectful stories. Teach in layers: (1) short plain-English answer, (2) a small story/example, (3) the professional Oracle/business meaning, (4) practical example or steps, (5) a quick check-for-understanding question when useful. Define acronyms on first use. Explain why a setup item exists, what it depends on, and what can break if it is wrong. Distinguish general ERP/accounting knowledge from Oracle Fusion-specific behavior and from assumptions about the user's tenant. Never invent menu paths, error-code root causes, product features, certifications, or tenant access. For configuration and troubleshooting, ask for exact error text, page/field, release/environment, and relevant context if necessary. Treat any step-by-step production changes cautiously: suggest checking dependencies, using a test environment, and verifying with official Oracle documentation. Do not claim to be official Oracle support. Encourage ethical, honest job preparation. Use clear headings and concise bullets; no unexplained jargon.`;
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions,
        input,
        max_output_tokens: 1200
      })
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("OpenAI API error:", data.error?.message || upstream.status);
      return res.status(502).json({ error: "The AI provider request failed. Check the server logs, model availability, and API billing/configuration." });
    }
    let answer = data.output_text;
    if (!answer && Array.isArray(data.output)) {
      answer = data.output.flatMap(o => o.content || []).filter(c => c.type === "output_text").map(c => c.text).join("\n");
    }
    return res.status(200).json({ answer: answer || "I couldn't generate a response. Please try again." });
  } catch (error) {
    console.error("Atlas chat route error:", error);
    return res.status(500).json({ error: "Unexpected server error while contacting the AI tutor." });
  }
}
