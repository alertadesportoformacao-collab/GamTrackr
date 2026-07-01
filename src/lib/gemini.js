const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

export async function askGemini(question, context, history = []) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey || apiKey === 'your-key-here') {
    throw new Error(
      'Chave da API Gemini não configurada. Adiciona VITE_GEMINI_API_KEY ao ficheiro .env e reinicia o servidor.'
    )
  }

  const systemText = `És um assistente de análise desportiva do clube Ass. Moradores Portela. Respondes sempre em português europeu. Só respondes com base nos dados reais fornecidos abaixo. Se não tiveres dados suficientes para responder, diz isso claramente. Sê conciso e direto.

DADOS ACTUAIS DO CLUBE:
${context}`

  const contents = [
    { role: 'user', parts: [{ text: systemText }] },
    { role: 'model', parts: [{ text: 'Entendido. Estou pronto para responder perguntas sobre os dados do clube.' }] },
    ...history.flatMap(({ question: q, answer: a }) => [
      { role: 'user', parts: [{ text: q }] },
      { role: 'model', parts: [{ text: a }] },
    ]),
    { role: 'user', parts: [{ text: question }] },
  ]

  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Erro HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Sem resposta.'
}
