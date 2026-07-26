// Vercel serverless function â€” runs server-side only.
// GEMINI_API_KEY is read from an environment variable, never from client code.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: "Missing message" });
  }

  const SYSTEM_PROMPT = `You are "Ustad Traffic" â€” a friendly, knowledgeable Pakistani driving instructor chatbot inside a learner's license test-prep app.
Scope: You ONLY answer questions about Pakistani traffic rules, road signs, driving test procedure, right-of-way, and vehicle documentation.
If a user asks something outside this scope, politely redirect them back to driving-test-related help.
Always answer in the language the user writes in (English, Urdu, or Roman Urdu/Hinglish).
Be encouraging and clear â€” many users are nervous about their upcoming test.`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server is missing GEMINI_API_KEY" });
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: message }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
        })
      }
    );

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("Gemini response missing text:", JSON.stringify(data));
      return res.status(502).json({ error: "AI service returned an unexpected response" });
    }

    return res.status(200).json({ text });
  } catch (err) {
    console.error("Gemini call failed:", err);
    return res.status(500).json({ error: "Sorry, I couldn't generate a response right now." });
  }
}
