// Vercel serverless function â€” runs server-side only.
// GEMINI_API_KEY is read from an environment variable, never from client code.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { questionEn, options, correctAnswer, selectedAnswer, wasCorrect } = req.body || {};
  if (!questionEn || !options || !correctAnswer || !selectedAnswer) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const SYSTEM_PROMPT = `You are an expert Pakistani Traffic Police driving instructor and examiner.
A student is preparing for their learner's driving license test.
You will be given a question, its options, the correct answer, and what the student chose.
Your job:
- If the student got it right: briefly reinforce WHY it's correct, referencing the real Pakistani traffic rule or sign convention.
- If the student got it wrong: gently point out the misconception in their chosen answer, then clearly explain the correct answer.
- Keep it to 2-4 sentences. Practical, simple, no textbook jargon.
- Match the student's language style â€” if they write in Roman Urdu/Hinglish, respond that way; otherwise use clear English.
- Never invent specific legal penalty amounts or rules you're unsure of â€” say "this may vary by province, please confirm with your local traffic office" instead of guessing.`;

  const userMessage = `Question: ${questionEn}\nOptions: ${options.join(", ")}\nCorrect answer: ${correctAnswer}\nStudent chose: ${selectedAnswer}\nWas correct: ${wasCorrect}`;

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
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
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
