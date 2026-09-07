import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Encabezado } from '../../components/Encabezado'
import { Badge, Button, Table, TableCell, TableHeaderCell, TableRow } from '../../components/ui'
import { AvisoError } from '../cuentas/AvisoError'
import { ModalRestablecerContrasena } from './ModalRestablecerContrasena'
import { listarCuentas, type CuentaAdmin } from './api'
import styles from './PantallaCuentas.module.css'

const FORMATO_FECHA = new Intl.DateTimeFormat('es-MX', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

function nombreCompleto(cuenta: CuentaAdmin): string {
  return `${cuenta.nombre} ${cuenta.apellidoPaterno} ${cuenta.apellidoMaterno}`
}

export function PantallaCuentas() {
  const [cuentaEnReset, setCuentaEnReset] = useState<CuentaAdmin | null>(null)

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['admin', 'cuentas'],
    queryFn: listarCuentas,
    retry: false,
  })

  return (
    <div className={styles.page}>
      <Encabezado />

      <main id="contenido" className={styles.main}>
        <header className={styles.encabezado}>
          <h1 className={styles.titulo}>Cuentas</h1>
          <p className={styles.subtitulo}>
            Todas las cuentas registradas en la plataforma y su estado.
          </p>
        </header>

        {isPending ? (
          <p role="status" className={styles.estadoTexto}>
            Cargando cuentas…
          </p>
        ) : isError ? (
          <AvisoError
            mensaje={error instanceof Error ? error.message : 'No pudimos cargar las cuentas.'}
          />
        ) : data.length === 0 ? (
          <p className={styles.estadoTexto}>Todavía no hay cuentas registradas.</p>
        ) : (
          <Table caption="Cuentas registradas">
            <thead>
              <TableRow>
                <TableHeaderCell>Nombre</TableHeaderCell>
                <TableHeaderCell>Correo</TableHeaderCell>
                <TableHeaderCell>Tipo</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
                <TableHeaderCell>Registro</TableHeaderCell>
                <TableHeaderCell>
                  <span className={styles.encabezadoAccion}>Acciones</span>
                </TableHeaderCell>
              </TableRow>
            </thead>
            <tbody>
              {data.map((cuenta) => (
                <TableRow key={cuenta.idUsuario}>
                  <TableCell>{nombreCompleto(cuenta)}</TableCell>
                  <TableCell>{cuenta.correo}</TableCell>
                  <TableCell>
                    {cuenta.tipoCuenta === 'administrador' ? 'Administrador' : 'Usuario'}
                  </TableCell>
                  <TableCell>
                    {cuenta.estadoCuenta === 'activa' ? (
                      <Badge variant="success">Activa</Badge>
                    ) : (
                      <Badge variant="neutral">Desactivada</Badge>
                    )}
                  </TableCell>
                  <TableCell>{FORMATO_FECHA.format(new Date(cuenta.fechaRegistro))}</TableCell>
                  <TableCell className={styles.celdaAccion}>
                    <Button variant="secondary" size="sm" onClick={() => setCuentaEnReset(cuenta)}>
                      Restablecer contraseña
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
      </main>

      {/* key por cuenta: al abrir el modal para otra persona (o reabrirlo tras
          un restablecimiento) remonta con estado y mutación frescos. */}
      <ModalRestablecerContrasena
        key={cuentaEnReset?.idUsuario ?? 'cerrado'}
        cuenta={cuentaEnReset}
        onCerrar={() => setCuentaEnReset(null)}
      />
    </div>
  )
}
