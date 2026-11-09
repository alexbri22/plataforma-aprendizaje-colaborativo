import { describe, expect, it } from 'vitest'
import { guiaEtapa } from './guiaEtapa'
import type { Actividad } from './tipos'

function actividad(sobrescribir: Partial<Actividad>): Actividad {
  return {
    id: 'a1',
    nombre: 'Taller',
    objetivo: '',
    fase: 'inscripcion',
    rol: 'organizador',
    numParticipantes: 0,
    fechaClave: '',
    nombreOrganizador: 'Ana',
    fechaInicio: '2026-09-01',
    fechaTermino: '2026-11-30',
    fechaLimiteInscripcion: '2026-09-05',
    plazoCierreDias: 10,
    configuracion: {},
    ...sobrescribir,
  }
}

describe('guiaEtapa', () => {
  it('en inscripción, quien organiza comparte la clave y sabe cuándo cierra sola', () => {
    const guia = guiaEtapa(actividad({}))!
    expect(guia.principal.texto).toMatch(/Comparte la clave/)
    expect(guia.principal.donde).toBe('Creación › Inscripción')
    expect(guia.tambien.map((p) => p.donde)).toEqual([
      'Creación › Planificar',
      'Creación › Conformación de equipos › Ajustes de formación',
    ])
    expect(guia.nota).toBe('La inscripción cierra sola el 5 sep 2026, si ya hay participantes.')
  })

  it('en formación, cambia según cómo se forman los equipos', () => {
    const autogestionada = guiaEtapa(actividad({ fase: 'formacion_equipos' }))!
    expect(autogestionada.nota).toMatch(/Pasa sola a desarrollo/)

    const manual = guiaEtapa(
      actividad({ fase: 'formacion_equipos', configuracion: { formacion_equipos: 'manual' } }),
    )!
    expect(manual.nota).toBe('Al confirmar los equipos empieza el desarrollo.')
  })

  it('quien participa en formación libre se une a un equipo, o espera si ya tiene uno', () => {
    const sinEquipo = guiaEtapa(actividad({ fase: 'formacion_equipos', rol: 'participante' }))!
    expect(sinEquipo.principal).toEqual({
      donde: 'Creación › Conformación de equipos',
      texto: 'Únete a un equipo o crea uno con su nombre.',
    })

    const conEquipo = guiaEtapa(
      actividad({ fase: 'formacion_equipos', rol: 'participante', idMiEquipo: 'e1' }),
    )!
    expect(conEquipo.principal.texto).toMatch(/Ya tienes equipo/)
  })

  it('en cierre, el plazo para reconocer es término + días de cierre', () => {
    const guia = guiaEtapa(actividad({ fase: 'cierre', rol: 'participante', idMiEquipo: 'e1' }))!
    expect(guia.principal.donde).toBe('Cierre › Otorgar reconocimientos')
    expect(guia.tambien.map((p) => p.donde)).toEqual(['Perfil › Insignias'])
    expect(guia.nota).toBe('Se puede reconocer hasta el 10 dic 2026.')
  })

  it('con reconocimientos deshabilitados no pide reconocer', () => {
    const guia = guiaEtapa(
      actividad({ fase: 'cierre', configuracion: { insignias: 'deshabilitado' } }),
    )!
    expect(guia.principal.donde).toBe('Desarrollo › Equipos')
    expect(guia.nota).toMatch(/se archiva sola/)
  })

  it('en cierre, quien organiza sabe dónde archivar sin esperar la fecha', () => {
    const guia = guiaEtapa(actividad({ fase: 'cierre' }))!
    expect(guia.tambien.map((p) => p.donde)).toContain('Cierre › Confirmar cierre de actividad')
  })

  it('nunca da un enlace: dice dónde, no lleva', () => {
    for (const fase of ['inscripcion', 'formacion_equipos', 'desarrollo', 'cierre'] as const) {
      const guia = guiaEtapa(actividad({ fase }))!
      for (const paso of [guia.principal, ...guia.tambien]) expect(paso).not.toHaveProperty('to')
    }
  })
})
