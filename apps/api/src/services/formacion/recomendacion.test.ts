import type { ElementoColaboracion, NivelCurso } from '@plataforma/shared'
import { describe, expect, it } from 'vitest'
import {
  coberturaPorElemento,
  nivelSugerido,
  recomendarRutas,
  type CursoDelPerfil,
  type PerfilFormativo,
  type RutaParaRecomendar,
} from './recomendacion.js'

/*
 * Perfiles sintéticos: cada prueba describe a una persona y comprueba que el
 * recomendador hace lo que la nota del incremento 4 promete.
 */

function curso(
  idCurso: string,
  elementos: ElementoColaboracion[],
  nivel: NivelCurso = 'inicial',
  disponible = true,
) {
  return { idCurso, elementos, nivel, disponible }
}

// Catálogo de prueba: tres rutas con focos distintos.
const COMUNICACION: RutaParaRecomendar = {
  idRuta: 'comunicacion',
  destacada: false,
  orden: 0,
  cursos: [
    curso('clara', ['interaccion_promotora']),
    curso('escucha', ['interaccion_promotora']),
    curso('feedback', ['interaccion_promotora', 'procesamiento_grupal'], 'intermedio'),
  ],
}

const ORGANIZACION: RutaParaRecomendar = {
  idRuta: 'organizacion',
  destacada: true,
  orden: 1,
  cursos: [
    curso('acuerdos', ['responsabilidades']),
    curso('metas', ['interdependencia_positiva']),
    curso('sin-vigilancia', ['responsabilidad_individual_grupal'], 'intermedio'),
  ],
}

const AVANZADA: RutaParaRecomendar = {
  idRuta: 'avanzada',
  destacada: false,
  orden: 2,
  cursos: [
    curso('decisiones', ['interdependencia_positiva'], 'avanzado'),
    curso('retro', ['procesamiento_grupal'], 'avanzado'),
  ],
}

const CATALOGO = [COMUNICACION, ORGANIZACION, AVANZADA]

function perfil(
  preferidos: ElementoColaboracion[] = [],
  cursos: CursoDelPerfil[] = [],
): PerfilFormativo {
  return { preferidos, cursos }
}

function hecho(
  idCurso: string,
  elementos: ElementoColaboracion[],
  nivel: NivelCurso = 'inicial',
): CursoDelPerfil {
  return { idCurso, estado: 'completado', elementos, nivel }
}

function empezado(idCurso: string, elementos: ElementoColaboracion[]): CursoDelPerfil {
  return { idCurso, estado: 'en_curso', elementos, nivel: 'inicial' }
}

const orden = (p: PerfilFormativo, rutas = CATALOGO) =>
  recomendarRutas(p, rutas).recomendaciones.map((r) => r.idRuta)

describe('arranque en frío', () => {
  it('sin preferencias ni cursos, el modo es editorial y la destacada va primero', () => {
    const resultado = recomendarRutas(perfil(), CATALOGO)
    expect(resultado.modo).toBe('editorial')
    expect(resultado.recomendaciones[0]).toMatchObject({
      idRuta: 'organizacion',
      razones: ['Ruta destacada por el equipo de contenido para empezar.'],
    })
  })

  it('en frío, una ruta avanzada queda al final', () => {
    expect(orden(perfil()).at(-1)).toBe('avanzada')
  })
})

describe('interés declarado', () => {
  it('quien eligió Interacción promotora recibe primero la ruta de comunicación', () => {
    const resultado = recomendarRutas(perfil(['interaccion_promotora']), CATALOGO)
    expect(resultado.modo).toBe('personalizado')
    expect(resultado.recomendaciones[0].idRuta).toBe('comunicacion')
    expect(resultado.recomendaciones[0].senales.interes).toBe(1)
    expect(resultado.recomendaciones[0].razones[0]).toBe(
      'Trabaja Interacción promotora, que elegiste fortalecer.',
    )
  })

  it('quien eligió Responsabilidades claras recibe primero la de organización', () => {
    expect(orden(perfil(['responsabilidades']))[0]).toBe('organizacion')
  })

  it('una ruta que no trabaja lo elegido tiene interés 0, no queda fuera', () => {
    const r = recomendarRutas(perfil(['responsabilidades']), CATALOGO).recomendaciones
    expect(r.find((x) => x.idRuta === 'comunicacion')?.senales.interes).toBe(0)
  })
})

describe('interés implícito', () => {
  it('sin preferencias, toma los elementos de los cursos en curso', () => {
    const p = perfil([], [empezado('otro', ['responsabilidades'])])
    const r = recomendarRutas(p, CATALOGO).recomendaciones[0]
    expect(r.idRuta).toBe('organizacion')
    expect(r.razones).toContain(
      'Trabaja Responsabilidades claras, como los cursos que estás haciendo.',
    )
  })

  it('sin interés de ninguna clase la señal no aplica y su peso se reparte', () => {
    const p = perfil([], [hecho('x', ['procesamiento_grupal'])])
    const r = recomendarRutas(p, CATALOGO).recomendaciones
    expect(r.every((x) => x.senales.interes === null)).toBe(true)
    expect(r.every((x) => x.puntaje >= 0 && x.puntaje <= 100)).toBe(true)
  })
})

describe('brecha: llenar los elementos que faltan', () => {
  it('quien ya cubrió Interacción promotora recibe primero lo que no ha trabajado', () => {
    const p = perfil(
      [],
      [hecho('a', ['interaccion_promotora']), hecho('b', ['interaccion_promotora'])],
    )
    const r = recomendarRutas(p, [COMUNICACION, ORGANIZACION]).recomendaciones
    expect(r[0].idRuta).toBe('organizacion')
    expect(r[0].senales.brecha).toBe(1)
    expect(r.find((x) => x.idRuta === 'comunicacion')?.senales.brecha).toBeLessThan(0.5)
    expect(r[0].razones.some((t) => t.startsWith('Cubre Responsabilidades claras'))).toBe(true)
  })

  it('un elemento se cubre con dos cursos terminados; con uno, a medias', () => {
    const uno = coberturaPorElemento(perfil([], [hecho('a', ['responsabilidades'])]))
    expect(uno.get('responsabilidades')).toBe(0.5)
    const dos = coberturaPorElemento(
      perfil([], [hecho('a', ['responsabilidades']), hecho('b', ['responsabilidades'])]),
    )
    expect(dos.get('responsabilidades')).toBe(1)
  })

  it('un curso empezado no cuenta como cobertura', () => {
    expect(coberturaPorElemento(perfil([], [empezado('a', ['responsabilidades'])])).size).toBe(0)
  })
})

describe('continuidad', () => {
  it('a igual interés, gana la ruta que ya empezó', () => {
    const p = perfil(['procesamiento_grupal'], [empezado('retro', ['procesamiento_grupal'])])
    const r = recomendarRutas(p, [COMUNICACION, AVANZADA]).recomendaciones
    const avanzada = r.find((x) => x.idRuta === 'avanzada')
    expect(avanzada?.senales.continuidad).toBe(0.25)
    expect(avanzada?.razones).toContain('Ya empezaste un curso de esta ruta.')
  })

  it('cuenta los cursos de la ruta ya terminados', () => {
    const p = perfil(['interaccion_promotora'], [hecho('clara', ['interaccion_promotora'])])
    const r = recomendarRutas(p, CATALOGO).recomendaciones[0]
    expect(r).toMatchObject({ idRuta: 'comunicacion', avance: { completados: 1, total: 3 } })
    expect(r.senales.continuidad).toBeCloseTo(1 / 3)
    // Aquí pesaron más el interés, la brecha y el nivel: las razones son las
    // tres que más aportaron, y la continuidad queda fuera.
    expect(r.razones).toHaveLength(3)
    expect(r.razones).not.toContain('Ya terminaste 1 de 3 cursos de esta ruta.')
  })

  it('una ruta terminada ya no se recomienda', () => {
    const p = perfil(
      [],
      COMUNICACION.cursos.map((c) => hecho(c.idCurso, [...c.elementos], c.nivel ?? 'inicial')),
    )
    expect(orden(p)).not.toContain('comunicacion')
  })
})

describe('nivel', () => {
  it('sin cursos terminados le toca inicial; después, el siguiente', () => {
    expect(nivelSugerido(perfil())).toBe('inicial')
    expect(nivelSugerido(perfil([], [hecho('a', [], 'inicial')]))).toBe('intermedio')
    expect(nivelSugerido(perfil([], [hecho('a', [], 'avanzado')]))).toBe('avanzado')
  })

  it('una ruta que empieza dos niveles arriba tiene nivel 0; uno arriba, 0.5', () => {
    const r = recomendarRutas(perfil(['procesamiento_grupal']), CATALOGO).recomendaciones
    expect(r.find((x) => x.idRuta === 'avanzada')?.senales.nivel).toBe(0)

    const conInicial = perfil(['procesamiento_grupal'], [hecho('z', [], 'inicial')])
    const r2 = recomendarRutas(conInicial, CATALOGO).recomendaciones
    expect(r2.find((x) => x.idRuta === 'avanzada')?.senales.nivel).toBe(0.5)
  })
})

describe('cursos no disponibles', () => {
  it('un curso retirado no cuenta para nada; una ruta sin disponibles no se recomienda', () => {
    const conRetirado: RutaParaRecomendar = {
      ...COMUNICACION,
      cursos: [curso('retirado', ['responsabilidades'], 'avanzado', false), ...COMUNICACION.cursos],
    }
    const r = recomendarRutas(perfil(['responsabilidades']), [conRetirado]).recomendaciones[0]
    expect(r.senales.interes).toBe(0)
    expect(r.senales.nivel).toBe(1)
    expect(r.avance.total).toBe(3)

    const vacia: RutaParaRecomendar = {
      ...COMUNICACION,
      cursos: [curso('x', ['responsabilidades'], 'inicial', false)],
    }
    expect(recomendarRutas(perfil(), [vacia]).recomendaciones).toEqual([])
  })
})

describe('forma del resultado', () => {
  it('puntaje entero de 0 a 100 y a lo más tres razones', () => {
    const p = perfil(['interaccion_promotora'], [empezado('clara', ['interaccion_promotora'])])
    for (const r of recomendarRutas(p, CATALOGO).recomendaciones) {
      expect(Number.isInteger(r.puntaje)).toBe(true)
      expect(r.puntaje).toBeGreaterThanOrEqual(0)
      expect(r.puntaje).toBeLessThanOrEqual(100)
      expect(r.razones.length).toBeLessThanOrEqual(3)
    }
  })

  it('es determinista: el mismo perfil da siempre el mismo orden', () => {
    const p = perfil(['interdependencia_positiva'])
    expect(orden(p)).toEqual(orden(p))
    expect(orden(p, [...CATALOGO].reverse())).toEqual(orden(p))
  })
})

describe('ejemplo documentado (nota del incremento 4)', () => {
  // Los cursos y rutas de las semillas; la tabla del documento de diseño debe
  // coincidir con lo que calcula el algoritmo.
  const ORGANIZACION_SEMILLA: RutaParaRecomendar = {
    idRuta: 'organizacion-y-corresponsabilidad',
    destacada: true,
    orden: 0,
    cursos: [
      curso('acuerdos', ['responsabilidades', 'interdependencia_positiva']),
      curso('reuniones', ['interaccion_promotora', 'responsabilidades']),
    ],
  }
  const MEJORA_SEMILLA: RutaParaRecomendar = {
    idRuta: 'mejora-continua',
    destacada: false,
    orden: 1,
    cursos: [
      curso('reuniones', ['interaccion_promotora', 'responsabilidades']),
      curso('retrospectivas', ['procesamiento_grupal'], 'intermedio'),
    ],
  }
  const cursos = [
    hecho('acuerdos', ['responsabilidades', 'interdependencia_positiva']),
    empezado('reuniones', ['interaccion_promotora', 'responsabilidades']),
  ]
  const puntajes = (p: PerfilFormativo) =>
    Object.fromEntries(
      recomendarRutas(p, [ORGANIZACION_SEMILLA, MEJORA_SEMILLA]).recomendaciones.map((r) => [
        r.idRuta,
        r.puntaje,
      ]),
    )

  it('sin elegir nada: Organización 76, Mejora continua 61', () => {
    expect(puntajes(perfil([], cursos))).toEqual({
      'organizacion-y-corresponsabilidad': 76,
      'mejora-continua': 61,
    })
  })

  it('después de elegir Procesamiento del grupo: Organización 46, Mejora continua 61', () => {
    const p = perfil(['procesamiento_grupal'], cursos)
    expect(puntajes(p)).toEqual({ 'organizacion-y-corresponsabilidad': 46, 'mejora-continua': 61 })
    expect(
      recomendarRutas(p, [ORGANIZACION_SEMILLA, MEJORA_SEMILLA]).recomendaciones[0].razones,
    ).toEqual([
      'Cubre Interacción promotora y Procesamiento del grupo, que aún no has trabajado en ningún curso.',
      'Trabaja Procesamiento del grupo, que elegiste fortalecer.',
      'Empieza en nivel inicial, adecuado para ti.',
    ])
  })
})
