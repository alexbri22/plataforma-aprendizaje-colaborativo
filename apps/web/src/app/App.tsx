import { useState } from 'react'
import { Badge, Button, Card, Input } from '../components/ui'
import styles from './App.module.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className={styles.app}>
      <div>
        <Badge>Fase 0 — Preparación</Badge>
        <h1>Plataforma de Aprendizaje Colaborativo</h1>
        <p>Esqueleto de apps/web levantado sobre el design system inicial (ver DESIGN.md).</p>
      </div>

      <Card>
        <Input label="Nombre" placeholder="Tu nombre" />
        <div className={styles.actions}>
          <Button onClick={() => setCount((current) => current + 1)}>Contador: {count}</Button>
          <Button variant="secondary">Cancelar</Button>
        </div>
      </Card>
    </main>
  )
}

export default App
