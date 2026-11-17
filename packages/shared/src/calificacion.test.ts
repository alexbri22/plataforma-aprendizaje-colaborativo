import { describe, expect, it } from 'vitest'
import {
  aspectoDeshabilitado,
  calcularCalificacion,
  componenteDeshabilitado,
  estructuraPorDefecto,
  formatosPara,
  repartoEquitativo,
  sumaDePesosActivos,
  type EstadoPuntaje,
  type EstructuraParaCalculo,
} from './calificacion.js'

// Ponderación y redistribución de general §4.2 y nucleo §10.3. Es lógica
// pura: estas pruebas separan un error de cálculo de uno de presentación.

const valor = (v: number): EstadoPuntaje => ({ estado: 'valor', valor: v })
const NO_APLICA: EstadoPuntaje = { estado: 'no_aplica' }
const PENDIENTE: EstadoPuntaje = { estado: 'pendiente' }

// Atajo: componentes y aspectos con id = su nombre, instrumentos 'aspecto#n'.
function estructura(
  componentes: Record<string, { peso: number; aspectos: Record<string, [number, number]> }>,
): EstructuraParaCalculo {
  return {
    componentes: Object.entries(componentes).map(([id, { peso, aspectos }]) => ({
      id,
      peso,
      aspectos: Object.entries(aspectos).map(([idAspecto, [pesoAspecto, instrumentos]]) => ({
        id: idAspecto,
        peso: pesoAspecto,
        instrumentos: Array.from({ length: instrumentos }, (_, i) => ({ id: `${idAspecto}#${i}` })),
      })),
    })),
  }
}

function puntajes(mapa: Record<string, EstadoPuntaje>, porDefecto = valor(100)) {
  return (id: string) => mapa[id] ?? porDefecto
}

function pesoDe(resultado: ReturnType<typeof calcularCalificacion>, idInstrumento: string) {
  for (const c of resultado.componentes)
    for (const a of c.aspectos)
      for (const i of a.instrumentos) if (i.id === idInstrumento) return i.pesoEfectivo
  throw new Error(`No existe ${idInstrumento}`)
}

describe('repartoEquitativo', () => {
  it('reparte 100 en enteros, con el residuo en los primeros', () => {
    expect(repartoEquitativo(3)).toEqual([34, 33, 33])
    expect(repartoEquitativo(6)).toEqual([17, 17, 17, 17, 16, 16])
    expect(repartoEquitativo(5)).toEqual([20, 20, 20, 20, 20])
    expect(repartoEquitativo(0)).toEqual([])
  })
})

describe('estructuraPorDefecto', () => {
  it('proyecto 40, proceso 40 y aprendizaje 20, con aspectos que suman 100 en cada componente', () => {
    const componentes = estructuraPorDefecto()
    expect(componentes.map((c) => [c.clave, c.peso])).toEqual([
      ['proyecto', 40],
      ['proceso', 40],
      ['aprendizaje', 20],
    ])
    for (const c of componentes) {
      expect(c.aspectos.reduce((suma, a) => suma + a.peso, 0)).toBe(100)
    }
  })

  it('el proyecto tiene un aspecto por elemento del espacio de equipo y la bitácora (P-40)', () => {
    const proyecto = estructuraPorDefecto().find((c) => c.clave === 'proyecto')!
    expect(proyecto.aspectos.map((a) => [a.clave, a.peso])).toEqual([
      ['metas', 17],
      ['planeacion', 17],
      ['avances', 17],
      ['recursos', 17],
      ['producto', 16],
      ['bitacora', 16],
    ])
  })

  it('aprendizaje es un solo puntaje que quien organiza captura a su criterio', () => {
    const aprendizaje = estructuraPorDefecto().find((c) => c.clave === 'aprendizaje')!
    expect(aprendizaje.aspectos).toEqual([
      {
        clave: 'valoracion',
        nombre: 'Aprendizaje',
        peso: 100,
        instrumentos: [
          { nombre: 'Aprendizaje', tipo: null, origen: 'manual', clavePlantilla: null },
        ],
      },
    ])
  })

  it('el proceso tiene los cinco aspectos del concepto, a 20 cada uno', () => {
    const proceso = estructuraPorDefecto().find((c) => c.clave === 'proceso')!
    expect(proceso.aspectos.map((a) => a.clave)).toEqual([
      'definicion_responsabilidades',
      'interdependencia_positiva',
      'responsabilidad_individual_grupal',
      'interaccion',
      'evaluacion_grupo_habilidades_sociales',
    ])
    expect(proceso.aspectos.map((a) => a.peso)).toEqual([20, 20, 20, 20, 20])
    // Ningún aspecto del proceso nace con instrumento: quien organiza lo elige.
    expect(proceso.aspectos.every((a) => a.instrumentos.length === 0)).toBe(true)
  })
})

describe('aspectos apagados por configuración', () => {
  const espacio = JSON.stringify({
    metas: 'obligatorio',
    planeacion: 'deshabilitado',
    avances: 'opcional',
    recursos: 'opcional',
    producto: 'opcional',
  })
  const configuracion = {
    bitacora_individual: 'deshabilitada',
    espacio_equipo: espacio,
  }

  it('bitácora y elementos del espacio deshabilitados están apagados', () => {
    expect(aspectoDeshabilitado('proyecto', 'bitacora', configuracion)).toBe(true)
    expect(aspectoDeshabilitado('aprendizaje', 'valoracion', configuracion)).toBe(false)
    expect(aspectoDeshabilitado('proyecto', 'planeacion', configuracion)).toBe(true)
    expect(aspectoDeshabilitado('proyecto', 'metas', configuracion)).toBe(false)
    expect(aspectoDeshabilitado('proceso', 'interaccion', configuracion)).toBe(false)
  })

  it('un componente con todos sus aspectos apagados está apagado', () => {
    const proyecto = estructuraPorDefecto().find((c) => c.clave === 'proyecto')!
    const todoApagado = {
      bitacora_individual: 'deshabilitada',
      espacio_equipo: JSON.stringify({
        metas: 'deshabilitado',
        planeacion: 'deshabilitado',
        avances: 'deshabilitado',
        recursos: 'deshabilitado',
        producto: 'deshabilitado',
      }),
    }
    expect(componenteDeshabilitado(proyecto, todoApagado)).toBe(true)
    expect(
      componenteDeshabilitado(proyecto, { ...todoApagado, bitacora_individual: 'libre' }),
    ).toBe(false)
    // Aprendizaje ya no depende de nada de la plataforma: nunca se apaga.
    const aprendizaje = estructuraPorDefecto().find((c) => c.clave === 'aprendizaje')!
    expect(componenteDeshabilitado(aprendizaje, todoApagado)).toBe(false)
  })

  it('lo apagado no entra en la suma de su nivel', () => {
    expect(
      sumaDePesosActivos([
        { peso: 84, apagado: false },
        { peso: 16, apagado: true },
      ]),
    ).toBe(84)
  })
})

describe('formatosPara', () => {
  it('la coevaluación ofrece la plantilla de pares o un enlace', () => {
    expect(formatosPara('responsabilidad_individual_grupal', 'coevaluacion')).toEqual([
      'plantilla',
      'enlace',
    ])
    expect(formatosPara('evaluacion_grupo_habilidades_sociales', 'coevaluacion')).toEqual([
      'plantilla',
      'enlace',
    ])
  })

  it('ofrece la plantilla solo donde existe para ese tipo y aspecto', () => {
    expect(formatosPara('interdependencia_positiva', 'cuestionario_autoevaluacion')).toEqual([
      'plantilla',
      'enlace',
    ])
    // El mismo tipo en un aspecto sin plantilla: solo enlace.
    expect(formatosPara('definicion_responsabilidades', 'cuestionario_autoevaluacion')).toEqual([
      'enlace',
    ])
  })

  it('sin plantilla, cualquier tipo es una actividad externa', () => {
    expect(formatosPara('interaccion', 'entrevista')).toEqual(['enlace'])
    expect(formatosPara('interaccion', 'rubrica')).toEqual(['enlace'])
    expect(formatosPara('responsabilidad_individual_grupal', 'examen')).toEqual(['enlace'])
  })
})

describe('calcularCalificacion: ponderación', () => {
  it('el ejemplo del documento: proceso 60 %, interacción 10 % del proceso, 3 cuestionarios → 2 % cada uno', () => {
    const e = estructura({
      proyecto: { peso: 40, aspectos: { proyecto: [100, 1] } },
      proceso: { peso: 60, aspectos: { interaccion: [10, 3], otros: [90, 1] } },
    })
    const resultado = calcularCalificacion(e, puntajes({}))
    expect(pesoDe(resultado, 'interaccion#0')).toBeCloseTo(2)
    expect(pesoDe(resultado, 'interaccion#1')).toBeCloseTo(2)
    expect(pesoDe(resultado, 'interaccion#2')).toBeCloseTo(2)
    expect(pesoDe(resultado, 'otros#0')).toBeCloseTo(54)
    expect(pesoDe(resultado, 'proyecto#0')).toBeCloseTo(40)
  })

  it('la calificación es el promedio ponderado de los puntajes', () => {
    const e = estructura({
      a: { peso: 40, aspectos: { a1: [100, 1] } },
      b: { peso: 60, aspectos: { b1: [50, 1], b2: [50, 2] } },
    })
    const resultado = calcularCalificacion(
      e,
      puntajes({ 'a1#0': valor(80), 'b1#0': valor(100), 'b2#0': valor(40), 'b2#1': valor(60) }),
    )
    // a = 80; b = 0.5·100 + 0.5·(40+60)/2 = 75; final = 0.4·80 + 0.6·75 = 77
    expect(resultado.valor).toBeCloseTo(77)
    expect(resultado.provisional).toBe(false)
  })

  it('los pesos efectivos de todos los instrumentos suman 100', () => {
    const e = estructura({
      a: { peso: 25, aspectos: { a1: [70, 2], a2: [30, 1] } },
      b: { peso: 75, aspectos: { b1: [100, 4] } },
    })
    const resultado = calcularCalificacion(e, puntajes({}))
    const total = resultado.componentes
      .flatMap((c) => c.aspectos)
      .flatMap((a) => a.instrumentos)
      .reduce((suma, i) => suma + i.pesoEfectivo, 0)
    expect(total).toBeCloseTo(100)
  })
})

describe('calcularCalificacion: redistribución', () => {
  it('un instrumento que no aplica reparte su peso entre los de su aspecto', () => {
    const e = estructura({ c: { peso: 100, aspectos: { a: [100, 3] } } })
    const resultado = calcularCalificacion(
      e,
      puntajes({ 'a#0': NO_APLICA, 'a#1': valor(60), 'a#2': valor(90) }),
    )
    expect(pesoDe(resultado, 'a#0')).toBe(0)
    expect(pesoDe(resultado, 'a#1')).toBeCloseTo(50)
    expect(resultado.valor).toBeCloseTo(75)
  })

  it('un aspecto sin nada que aplique reparte su peso entre los aspectos del componente, en proporción', () => {
    // Evaluación por pares en un equipo de una persona.
    const e = estructura({
      proceso: { peso: 100, aspectos: { pares: [20, 1], x: [60, 1], y: [20, 1] } },
    })
    const resultado = calcularCalificacion(
      e,
      puntajes({ 'pares#0': NO_APLICA, 'x#0': valor(100), 'y#0': valor(0) }),
    )
    expect(pesoDe(resultado, 'x#0')).toBeCloseTo(75) // 60 / 80
    expect(pesoDe(resultado, 'y#0')).toBeCloseTo(25) // 20 / 80
    expect(resultado.valor).toBeCloseTo(75)
  })

  it('un aspecto sin instrumentos no aplica y su peso se redistribuye', () => {
    const e = estructura({ proceso: { peso: 100, aspectos: { vacio: [50, 0], x: [50, 1] } } })
    const resultado = calcularCalificacion(e, puntajes({ 'x#0': valor(70) }))
    expect(pesoDe(resultado, 'x#0')).toBeCloseTo(100)
    expect(resultado.valor).toBeCloseTo(70)
  })

  it('un componente sin nada que aplique sube el reparto a la actividad', () => {
    // Bitácora deshabilitada: el aprendizaje no aplica.
    const e = estructura({
      proyecto: { peso: 40, aspectos: { proyecto: [100, 1] } },
      proceso: { peso: 40, aspectos: { p: [100, 1] } },
      aprendizaje: { peso: 20, aspectos: { bitacora: [100, 1] } },
    })
    const resultado = calcularCalificacion(
      e,
      puntajes({ 'proyecto#0': valor(100), 'p#0': valor(50), 'bitacora#0': NO_APLICA }),
    )
    expect(resultado.componentes.map((c) => c.pesoEfectivo)).toEqual([50, 50, 0])
    expect(resultado.valor).toBeCloseTo(75)
  })

  it('si nada aplica, no hay calificación', () => {
    const e = estructura({ c: { peso: 100, aspectos: { a: [100, 2] } } })
    const resultado = calcularCalificacion(e, () => NO_APLICA)
    expect(resultado.valor).toBeNull()
    expect(resultado.provisional).toBe(false)
  })

  it('un aspecto con peso 0 que aplica no recibe nada del reparto', () => {
    const e = estructura({ c: { peso: 100, aspectos: { cero: [0, 1], x: [100, 1] } } })
    const resultado = calcularCalificacion(e, puntajes({ 'cero#0': valor(0), 'x#0': valor(90) }))
    expect(pesoDe(resultado, 'cero#0')).toBe(0)
    expect(resultado.valor).toBeCloseTo(90)
  })
})

describe('calcularCalificacion: pendientes (P-39)', () => {
  it('un pendiente cuenta 0 y marca la calificación como provisional', () => {
    const e = estructura({ c: { peso: 100, aspectos: { a: [100, 2] } } })
    const resultado = calcularCalificacion(e, puntajes({ 'a#0': valor(80), 'a#1': PENDIENTE }))
    expect(resultado.valor).toBeCloseTo(40)
    expect(resultado.provisional).toBe(true)
    // Pendiente no es "no aplica": conserva su peso.
    expect(pesoDe(resultado, 'a#1')).toBeCloseTo(50)
  })

  it('un pendiente con peso efectivo 0 no hace provisional la calificación', () => {
    const e = estructura({ c: { peso: 100, aspectos: { cero: [0, 1], x: [100, 1] } } })
    const resultado = calcularCalificacion(e, puntajes({ 'cero#0': PENDIENTE, 'x#0': valor(90) }))
    expect(resultado.provisional).toBe(false)
    expect(resultado.valor).toBeCloseTo(90)
  })
})
