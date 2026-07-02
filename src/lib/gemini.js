import { GEMINI_LANG_INSTRUCTIONS } from '../i18n/translations'

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

const READY_ACK = {
  pt:    'Entendido. Estou pronto para responder perguntas sobre os dados do clube.',
  'pt-BR': 'Entendido. Estou pronto para responder perguntas sobre os dados do clube.',
  es:    'Entendido. Estoy listo para responder preguntas sobre los datos del club.',
  fr:    'Compris. Je suis prêt à répondre aux questions sur les données du club.',
  en:    'Understood. I\'m ready to answer questions about the club\'s data.',
  de:    'Verstanden. Ich bin bereit, Fragen zu den Vereinsdaten zu beantworten.',
}

export async function askGemini(question, context, history = [], lang = 'pt') {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey || apiKey === 'your-key-here') {
    throw new Error(
      'Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env and restart.'
    )
  }

  const langInstruction = GEMINI_LANG_INSTRUCTIONS[lang] || GEMINI_LANG_INSTRUCTIONS.pt

  const systemText = `You are a sports analysis assistant for the club Ass. Moradores Portela. ${langInstruction} Only answer based on the real data provided below. If you don't have enough data to answer, say so clearly. Be concise and direct.

CURRENT CLUB DATA:
${context}`

  const contents = [
    { role: 'user',  parts: [{ text: systemText }] },
    { role: 'model', parts: [{ text: READY_ACK[lang] || READY_ACK.pt }] },
    ...history.flatMap(({ question: q, answer: a }) => [
      { role: 'user',  parts: [{ text: q }] },
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
    throw new Error(err.error?.message || `HTTP error ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '—'
}
