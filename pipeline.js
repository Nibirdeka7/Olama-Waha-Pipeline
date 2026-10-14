const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const WAHA_URL = process.env.WAHA_URL || 'http://localhost:3000';
const WAHA_API_KEY = process.env.WAHA_API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID;

const sampleScrapedItem = {
  title: 'Google Software Engineering Intern 2027',
  text: `Google has opened applications for Summer 2027 Software Engineering Interns across Bangalore and Hyderabad.
Eligible batches: 2027 and 2028 graduates (B.Tech / B.E / Dual Degree in CS or related technical field).
Requirements: Strong foundations in Data Structures, Algorithms, Problem Solving, and proficiency in C++, Java, or Python.
Stipend: ₹1,10,000/month.
Apply immediately via Google Careers.`,
  url: 'https://careers.google.com/jobs/results'
};

async function main() {
  console.log('--- Step 1: Processing with Ollama SLM (llama3.2:1b) ---');
  
  const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2:1b',
      format: 'json',
      stream: false,
      prompt: `Summarize the following job posting into structured JSON:
"""${sampleScrapedItem.text}"""`,
      system: `You are an automated extraction assistant. Return ONLY valid JSON matching this schema:
{
  "title": "string",
  "batch_eligible": "string",
  "summary_points": ["string"],
  "apply_url": "string"
}`
    })
  });

  if (!ollamaRes.ok) {
    throw new Error(`Ollama failed: ${await ollamaRes.text()}`);
  }

  const ollamaJson = await ollamaRes.json();
  const structured = JSON.parse(ollamaJson.response);
  console.log('Parsed Ollama output:\n', structured);

  console.log('\n--- Step 2: Formatting WhatsApp Markdown ---');
  const bulletLines = (structured.summary_points || []).map(p => `• ${p}`).join('\n');
  const message = `🚀 *${structured.title || sampleScrapedItem.title}*

🎓 *Batch Eligible:* ${structured.batch_eligible || '2027/2028'}

${bulletLines}

🔗 *Apply Link:* ${structured.apply_url || sampleScrapedItem.url}

⚡ _Automated broadcast via GitHub Actions + Ollama_`;

  console.log('Message Preview:\n', message);

  console.log('\n--- Step 3: Dispatching to WhatsApp Channel via WAHA ---');
  const wahaRes = await fetch(`${WAHA_URL}/api/sendText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': WAHA_API_KEY
    },
    body: JSON.stringify({
      chatId: CHANNEL_ID,
      text: message,
      session: 'default'
    })
  });

  const wahaData = await wahaRes.json();
  console.log('WAHA Response:', wahaData);
}

main().catch(err => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
