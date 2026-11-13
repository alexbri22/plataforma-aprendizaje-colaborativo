import { describe, expect, it } from 'vitest'
import { calcularProgreso, type LeccionParaProgreso } from './calculoProgreso.js'

function leccion(
  idLeccion: string,
  orden: number,
  extra: Partial<LeccionParaProgreso> = {},
): LeccionParaProgreso {
  return {
    idLeccion,
    orden,
    titulo: `Lección ${idLeccion}`,
    tipo: 'lectura',
    obligatoria: true,
    recurso: null,
    ...extra,
  }
}

describe('calcularProgreso', () => {
  it('cuenta solo las obligatorias y redondea hacia abajo', () => {
    const lecciones = [
      leccion('a', 0),
      leccion('b', 1),
      leccion('c', 2),
      leccion('d', 3, { obligatoria: false }),
    ]
    const progreso = calcularProgreso(lecciones, new Set(['a', 'd']))
    expect(progreso).toMatchObject({ total: 3, completadas: 1, porcentaje: 33, completo: false })
  })

  it('la siguiente es la primera disponible sin completar, en orden, aunque sea opcional', () => {
    const lecciones = [leccion('b', 1, { obligatoria: false }), leccion('a', 0), leccion('c', 2)]
    expect(calcularProgreso(lecciones, new Set(['a'])).siguiente).toEqual({
      idLeccion: 'b',
      titulo: 'Lección b',
    })
  })

  it('una lección con el recurso retirado no cuenta ni es la siguiente', () => {
    const lecciones = [
      leccion('a', 0),
      leccion('r', 1, {
        tipo: 'recurso',
        titulo: '',
        recurso: { titulo: 'X', estatus: 'retirado' },
      }),
    ]
    const progreso = calcularProgreso(lecciones, new Set(['a']))
    expect(progreso).toMatchObject({ total: 1, completadas: 1, porcentaje: 100, completo: true })
    expect(progreso.siguiente).toBeNull()
  })

  it('una lección de recurso sin título toma el del recurso', () => {
    const lecciones = [
      leccion('r', 0, {
        tipo: 'recurso',
        titulo: '',
        recurso: { titulo: 'Guía de acuerdos', estatus: 'publicado' },
      }),
    ]
    expect(calcularProgreso(lecciones, new Set()).siguiente?.titulo).toBe('Guía de acuerdos')
  })

  it('sin obligatorias disponibles cuentan todas las disponibles', () => {
    const lecciones = [
      leccion('a', 0, { obligatoria: false }),
      leccion('b', 1, { obligatoria: false }),
    ]
    expect(calcularProgreso(lecciones, new Set()).completo).toBe(false)
    expect(calcularProgreso(lecciones, new Set(['a'])).porcentaje).toBe(50)
    expect(calcularProgreso(lecciones, new Set(['a', 'b'])).completo).toBe(true)
  })

  it('un curso sin lecciones disponibles nunca está completo', () => {
    expect(calcularProgreso([], new Set())).toMatchObject({
      total: 0,
      porcentaje: 0,
      completo: false,
    })
  })
})
