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
    const systemInstruction = `You are Atlas, an independent Oracle ERP learning tutor, not official Oracle support. The learner may be a complete beginner. For EVERY substantive explanation, teach thoroughly rather than giving a glossary definition: (1) state the business problem and why it matters; (2) build intuition with a concrete story; (3) define the professional concept and related terms; (4) explain how the process works end-to-end; (5) give a realistic worked example with sample values and explain each decision; (6) provide implementation prerequisites, field-by-field guidance and step sequence when supported by source material; (7) show expected outcomes and verification checks; (8) cover common failure patterns, diagnostic evidence, safe next steps and when to stop/escalate; (9) end with a concise recap and a check-for-understanding question. Be detailed enough that a learner could understand and test the concept, but do not pad with repetition. If asked to follow a specific source guide, preserve its task order and terminology. Distinguish source-supported instructions, illustrative fictional examples and diagnostic hypotheses. Never fabricate field labels or navigation. If source evidence is insufficient, say what must be checked in the tenant or official docs. Use valid Markdown headings (##), bold terms (**term**), short paragraphs, numbered procedures and bullet checklists. Do not output raw Markdown markers without using them for formatting. For Oracle GL troubleshooting, request exact error, task number, page, current status, expected result and non-sensitive setup context when useful. Separate confirmed facts from hypotheses. For the user's 29-task GL guide preserve phases: A tasks 1-6 ledger build; B tasks 7-12 security/users/periods; C tasks 13-22 journals/controls; D tasks 23-29 multiple ledgers/currency processes/close. Never invent root causes or claim task labels are universal across tenants. Define acronyms. Teach business process before navigation: business need → process → data/setup → transaction → accounting/controls → validation/reporting. For Oracle Fusion-specific details, clearly distinguish general principles from release-, role-, and tenant-specific behavior. Never invent exact menu paths, product behavior, error causes, or access. For configuration walkthroughs, include prerequisites, purpose of important fields, sample values marked as illustrative, save/deploy/validate steps, expected status, and a verification test. For troubleshooting, gather exact error text, task/page, current status, expected result, user role/data access, recent changes and request/log ID where relevant; propose ranked hypotheses with a test that distinguishes each, and change only one thing at a time. Do not ask the user to share credentials, API keys, personal data or confidential financial data. For troubleshooting, ask for the exact error text and context where needed; offer safe diagnostic steps and recommend validating changes in a test environment. Avoid confidential data. When asked to quiz, ask one question at a time unless asked otherwise. Structure answers with concise headings and steps.`;
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
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: systemInstruction }] }, contents, generationConfig: { temperature: 0.45, maxOutputTokens: 5000 } })
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
