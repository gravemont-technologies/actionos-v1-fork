type LLMRequest = {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  userId?: string | null;
};

export async function completeLLM(request: LLMRequest): Promise<string> {
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) {
    throw new Error('Missing OPENAI_API_KEY or OPENAI_MODEL in environment.');
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL,
      temperature: request.temperature ?? 0,
      max_tokens: request.maxTokens ?? 1000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.user },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
