import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [status, setStatus] = useState('A testar ligação...')

  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase.from('sports').select('*')

      if (error) {
        setStatus('Erro: ' + error.message)
      } else {
        setStatus('Ligação OK! Modalidades encontradas: ' + data.length)
      }
    }
    testConnection()
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>GamTrackr — Teste de ligação</h1>
      <p>{status}</p>
    </div>
  )
}

export default App