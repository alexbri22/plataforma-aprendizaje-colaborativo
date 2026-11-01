import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './EnlacePerfil.module.css'

export interface EnlacePerfilProps {
  idUsuario: string
  children: ReactNode
  className?: string
}

/**
 * El nombre de una persona como enlace a su perfil (/usuarios/:id). Toma la
 * tipografía y el color de donde se use: se distingue al pasar el cursor o al
 * recibir el foco, para no convertir cada lista en una lista de enlaces
 * azules. El propio id redirige a Mi perfil (PantallaPerfilDeUsuario).
 */
export function EnlacePerfil({ idUsuario, children, className }: EnlacePerfilProps) {
  return (
    <Link
      to={`/usuarios/${encodeURIComponent(idUsuario)}`}
      className={[styles.enlace, className].filter(Boolean).join(' ')}
    >
      {children}
    </Link>
  )
}
