import { describe, expect, it } from 'vitest'
import {
  PLANTILLAS_INSTRUMENTO,
  calcularPares,
  puntajeLikert,
  validarRespuestasDistribucion,
  validarRespuestasLikert,
} from './plantillas.js'

// Puntaje de las autoevaluaciones (nucleo §10.1). Es lógica pura del
// cálculo: se prueba en cuanto existe.

const plantilla = PLANTILLAS_INSTRUMENTO.autoevaluacion_comunicacion
const todas = (valor: number) =>
  Object.fromEntries(plantilla.reactivos.map((r) => [r.clave, valor]))

describe('puntajeLikert', () => {
  it('va de 0 con todo en Nunca a 100 con todo en Siempre', () => {
    expect(puntajeLikert(plantilla, todas(1))).toBe(0)
    expect(puntajeLikert(plantilla, todas(4))).toBe(100)
  })

  it('es (promedio − 1) / 3', () => {
    // Promedio 2.5 → 50.
    const mitad = Object.fromEntries(plantilla.reactivos.map((r, i) => [r.clave, i % 2 ? 2 : 3]))
    expect(puntajeLikert(plantilla, mitad)).toBe(50)
    // Promedio 3 → 66.67.
    expect(puntajeLikert(plantilla, todas(3))).toBe(66.67)
  })
})

describe('validarRespuestasLikert', () => {
  it('exige todos los reactivos con un valor de la escala', () => {
    const respuestas = todas(3)
    expect(validarRespuestasLikert(plantilla, respuestas)).toEqual({ respuestas })

    const incompleta = { ...respuestas, ideas_claras: undefined }
    expect(validarRespuestasLikert(plantilla, incompleta)).toEqual({
      errores: { ideas_claras: 'Elige una opción.' },
    })
    expect(validarRespuestasLikert(plantilla, { ...respuestas, ideas_claras: 5 })).toHaveProperty(
      'errores.ideas_claras',
    )
    expect(validarRespuestasLikert(plantilla, { ...respuestas, otra: 2 })).toHaveProperty(
      'errores.otra',
    )
  })
})

describe('PLANTILLAS_INSTRUMENTO', () => {
  it('tiene los reactivos del documento de evaluaciones, con claves únicas', () => {
    expect(PLANTILLAS_INSTRUMENTO.autoevaluacion_responsabilidad.reactivos).toHaveLength(9)
    expect(PLANTILLAS_INSTRUMENTO.autoevaluacion_comunicacion.reactivos).toHaveLength(8)
    expect(PLANTILLAS_INSTRUMENTO.autoevaluacion_interdependencia.reactivos).toHaveLength(8)
    expect(PLANTILLAS_INSTRUMENTO.evaluacion_pares.reactivos).toHaveLength(9)
    for (const p of Object.values(PLANTILLAS_INSTRUMENTO)) {
      expect(new Set(p.reactivos.map((r) => r.clave)).size).toBe(p.reactivos.length)
    }
  })
})

describe('evaluación por pares', () => {
  const pares = PLANTILLAS_INSTRUMENTO.evaluacion_pares
  const equipo = ['a', 'b', 'c', 'd']
  // El mismo reparto en las nueve acciones.
  const igual = (reparto: Record<string, number>) =>
    Object.fromEntries(pares.reactivos.map((r) => [r.clave, reparto]))

  it('valida que cada acción reparta 100 % exactamente entre el equipo', () => {
    const bien = igual({ a: 25, b: 25, c: 25, d: 25 })
    expect(validarRespuestasDistribucion(pares, bien, equipo)).toEqual({ respuestas: bien })
    expect(
      validarRespuestasDistribucion(pares, igual({ a: 30, b: 25, c: 25, d: 25 }), equipo),
    ).toHaveProperty('errores.aportar_ideas', 'Suma 105 %; debe sumar 100 %.')
    expect(
      validarRespuestasDistribucion(pares, igual({ a: 50, b: 50, c: 0 }), equipo),
    ).toHaveProperty('errores.aportar_ideas')
    expect(
      validarRespuestasDistribucion(pares, igual({ a: 25.5, b: 24.5, c: 25, d: 25 }), equipo),
    ).toHaveProperty('errores.aportar_ideas')
  })

  it('el factor es lo recibido de los demás entre 100 / n, con tope en 100', () => {
    // b, c y d le dan 25 a "a": la parte igualitaria, factor 1 → 100.
    const respuestas = {
      a: igual({ a: 70, b: 10, c: 10, d: 10 }),
      b: igual({ a: 25, b: 25, c: 25, d: 25 }),
      c: igual({ a: 25, b: 25, c: 25, d: 25 }),
      d: igual({ a: 25, b: 25, c: 25, d: 25 }),
    }
    const a = calcularPares(pares, 'a', equipo, respuestas)
    expect(a.puntaje).toBe(100)
    // La autoasignación no entra en el cálculo, solo se muestra.
    expect(a.porAccion[0]).toEqual({ clave: 'aportar_ideas', recibido: 25, autoasignado: 70 })

    // "b" recibe 10 de "a" y 25 de c y d: promedio 20, factor 0.8 → 80.
    expect(calcularPares(pares, 'b', equipo, respuestas).puntaje).toBe(80)
  })

  it('quien aporta de más no supera 100', () => {
    const respuestas = {
      b: igual({ a: 70, b: 10, c: 10, d: 10 }),
      c: igual({ a: 70, b: 10, c: 10, d: 10 }),
    }
    expect(calcularPares(pares, 'a', equipo, respuestas).puntaje).toBe(100)
  })

  it('no aplica en un equipo de uno ni si nadie más respondió', () => {
    expect(calcularPares(pares, 'a', ['a'], { a: igual({ a: 100 }) }).puntaje).toBeNull()
    expect(
      calcularPares(pares, 'a', equipo, { a: igual({ a: 25, b: 25, c: 25, d: 25 }) }).puntaje,
    ).toBeNull()
  })

  it('descarta las respuestas que ya no coinciden con el equipo', () => {
    // "c" respondió cuando el equipo era a, b, c: tras la reasignación no cuenta.
    const respuestas = {
      b: igual({ a: 25, b: 25, c: 25, d: 25 }),
      c: igual({ a: 50, b: 25, c: 25 }),
    }
    expect(calcularPares(pares, 'a', equipo, respuestas).porAccion[0].recibido).toBe(25)
  })
})
