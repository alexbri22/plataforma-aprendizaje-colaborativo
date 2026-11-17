import { describe, expect, it } from 'vitest'
import {
  ELEMENTOS_CON_HISTORIA,
  LONGITUD_MAXIMA_RESPUESTA_BITACORA,
  SECCIONES_RETROALIMENTACION,
  corregibleHoy,
  diaEnCDMX,
  esSeccionRetroalimentacion,
  fueEditada,
  PREGUNTAS_BITACORA,
  mismasRespuestasBitacora,
  primeraRespuestaBitacora,
  validarRespuestasBitacora,
} from './seguimiento.js'

// Bitácora guiada (nucleo §9.3): la validación es la misma en el cliente y
// en el servidor, así que sus reglas se fijan aquí una sola vez.

describe('PREGUNTAS_BITACORA', () => {
  it('son las diez preguntas del documento de evaluaciones, con claves únicas', () => {
    const claves = PREGUNTAS_BITACORA.map((pregunta) => pregunta.clave)
    expect(claves).toHaveLength(10)
    expect(new Set(claves).size).toBe(10)
  })
})

describe('validarRespuestasBitacora', () => {
  it('recorta, descarta las vacías y devuelve el orden del catálogo', () => {
    const resultado = validarRespuestasBitacora({
      duda_pendiente: '  ¿cómo se cita?  ',
      tareas_cumplidas: '   ',
      conocimientos_adquiridos: 'Aprendí a dividir el trabajo',
    })
    expect(resultado).toEqual({
      respuestas: {
        conocimientos_adquiridos: 'Aprendí a dividir el trabajo',
        duda_pendiente: '¿cómo se cita?',
      },
    })
    // El orden importa: editar compara la serialización para no registrar
    // un cambio que no hubo.
    if ('respuestas' in resultado) {
      expect(Object.keys(resultado.respuestas)).toEqual([
        'conocimientos_adquiridos',
        'duda_pendiente',
      ])
    }
  })

  it('exige al menos una respuesta no vacía', () => {
    expect(validarRespuestasBitacora({ tareas_cumplidas: '  ' })).toEqual({
      errores: { respuestas: 'Responde al menos una pregunta.' },
    })
    expect(validarRespuestasBitacora({})).toHaveProperty('errores.respuestas')
  })

  it('rechaza lo que no es un objeto de respuestas', () => {
    for (const valor of [undefined, null, 'texto', ['a']]) {
      expect(validarRespuestasBitacora(valor)).toHaveProperty('errores.respuestas')
    }
  })

  it('rechaza una clave que no es del catálogo y un valor que no es texto', () => {
    expect(validarRespuestasBitacora({ conocimientos_adquiridos: 'a', inventada: 'x' })).toEqual({
      errores: { inventada: 'No es una pregunta de la bitácora.' },
    })
    expect(validarRespuestasBitacora({ conocimientos_adquiridos: 3 })).toEqual({
      errores: { conocimientos_adquiridos: 'Debe ser texto.' },
    })
  })

  it('aplica la longitud máxima por respuesta, después de recortar', () => {
    const justo = 'a'.repeat(LONGITUD_MAXIMA_RESPUESTA_BITACORA)
    expect(validarRespuestasBitacora({ aportacion_concreta: ` ${justo} ` })).toEqual({
      respuestas: { aportacion_concreta: justo },
    })
    expect(validarRespuestasBitacora({ aportacion_concreta: `${justo}a` })).toHaveProperty(
      'errores.aportacion_concreta',
    )
  })
})

describe('primeraRespuestaBitacora', () => {
  it('toma la primera en el orden del catálogo, no en el del objeto', () => {
    expect(
      primeraRespuestaBitacora({ importancia_cooperar: 'última', tiempo_aprovechado: 'antes' }),
    ).toBe('antes')
    expect(primeraRespuestaBitacora({})).toBe('')
  })
})

describe('mismasRespuestasBitacora', () => {
  it('compara pregunta por pregunta, sin importar el orden de las claves', () => {
    expect(
      mismasRespuestasBitacora(
        { conocimientos_adquiridos: 'a', duda_pendiente: 'b' },
        { duda_pendiente: 'b', conocimientos_adquiridos: 'a' },
      ),
    ).toBe(true)
    expect(
      mismasRespuestasBitacora(
        { conocimientos_adquiridos: 'a', duda_pendiente: 'b' },
        { conocimientos_adquiridos: 'a' },
      ),
    ).toBe(false)
  })
})

describe('registros en el tiempo: corregir solo el mismo día', () => {
  it('el día se cuenta en Ciudad de México (UTC-6), no en UTC', () => {
    // 11 nov 23:30 en CDMX es 12 nov 05:30 UTC.
    expect(diaEnCDMX(new Date('2026-11-12T05:30:00Z'))).toBe('2026-11-11')
    expect(diaEnCDMX(new Date('2026-11-12T06:00:00Z'))).toBe('2026-11-12')
  })

  it('se corrige el mismo día y no al siguiente', () => {
    const escrita = '2026-11-12T15:00:00Z' // 9:00 en CDMX
    expect(corregibleHoy(escrita, new Date('2026-11-13T05:59:00Z'))).toBe(true) // 23:59
    expect(corregibleHoy(escrita, new Date('2026-11-13T06:00:00Z'))).toBe(false) // 0:00
  })

  it('solo los avances, entre los elementos del espacio, son un registro en el tiempo', () => {
    expect(ELEMENTOS_CON_HISTORIA).toEqual(['avances'])
  })

  it('cuenta como editada solo si cambió pasado el margen de dos minutos', () => {
    const creada = '2026-11-12T15:00:00.000Z'
    expect(fueEditada(creada, '2026-11-12T15:01:00.000Z')).toBe(false)
    expect(fueEditada(creada, '2026-11-12T15:03:00.000Z')).toBe(true)
  })
})

describe('retroalimentación', () => {
  it('se da sobre el equipo en general o sobre una sección de su espacio', () => {
    expect(SECCIONES_RETROALIMENTACION).toEqual([
      'general',
      'metas',
      'planeacion',
      'avances',
      'recursos',
      'producto',
    ])
    expect(esSeccionRetroalimentacion('metas')).toBe(true)
    expect(esSeccionRetroalimentacion('bitacora')).toBe(false)
  })
})
