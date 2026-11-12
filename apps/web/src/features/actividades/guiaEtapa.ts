import { formatearFecha, sumarDias } from './formato'
import type { Actividad } from './tipos'

export interface PasoGuia {
  /** La sección de la barra lateral donde se hace ("Equipos", "Mi equipo ›
   * Avances"). Sin ella, el paso es esperar o no depende de una pantalla. */
  donde?: string
  texto: string
}

export interface GuiaEtapa {
  /** Lo principal de esta etapa: una sola cosa. */
  principal: PasoGuia
  /** Una o dos cosas más de la misma etapa, de menor prioridad. */
  tambien: PasoGuia[]
  /** Qué pasa después y cuándo (las transiciones automáticas por fecha). */
  nota?: string
}

function fecha(fechaIso: string | undefined): string {
  return fechaIso ? formatearFecha(fechaIso) : ''
}

// Último día para reconocer: término + plazo de cierre (el mismo cálculo que
// el servidor usa para cerrar el ritual y archivar la actividad).
export function finDelCierre(actividad: Actividad): string | undefined {
  if (!actividad.fechaTermino || actividad.plazoCierreDias == null) return undefined
  return sumarDias(actividad.fechaTermino, actividad.plazoCierreDias)
}

// Qué se hace en cada etapa, según el rol (feedback de las coordinadoras:
// "no queda claro qué se supone que debo hacer ahora"). Es informativo, no
// un atajo (decisión de producto): dice en qué sección de la barra lateral
// se hace cada cosa, para que la persona aprenda dónde está, en vez de darle
// un botón que la lleve. Lo muestra el Resumen (EtapasActividad). Las notas
// describen las transiciones automáticas de la tarea programada del
// servidor (transicionarActividadesVencidas).
export function guiaEtapa(actividad: Actividad): GuiaEtapa | null {
  const organiza = actividad.rol !== 'participante'
  const autogestionada = actividad.configuracion?.formacion_equipos !== 'manual'
  const fin = finDelCierre(actividad)
  const reconocimientos = actividad.configuracion?.insignias !== 'deshabilitado'

  if (organiza) {
    switch (actividad.fase) {
      case 'configuracion':
      case 'inscripcion':
        return {
          principal: {
            donde: 'Creación › Inscripción',
            texto: 'Comparte la clave de ingreso para que los participantes se unan.',
          },
          tambien: [
            { donde: 'Creación › Planificar', texto: 'Elige qué seguimiento tendrá la actividad.' },
            {
              donde: 'Creación › Conformación de equipos › Ajustes de formación',
              texto: 'Decide cómo se forman los equipos y de qué tamaño.',
            },
          ],
          nota: actividad.fechaLimiteInscripcion
            ? `La inscripción cierra sola el ${fecha(actividad.fechaLimiteInscripcion)}, si ya hay participantes.`
            : undefined,
        }
      case 'formacion_equipos':
        return {
          principal: {
            donde: 'Creación › Conformación de equipos',
            texto: autogestionada
              ? 'Revisa que todos tengan equipo y completa los que estén marcados.'
              : 'Sugiere equipos o arma cada uno, y luego confírmalos.',
          },
          tambien: [],
          nota: autogestionada
            ? 'Pasa sola a desarrollo cuando todos tienen equipo. También puedes confirmar los equipos tú.'
            : 'Al confirmar los equipos empieza el desarrollo.',
        }
      case 'desarrollo':
        return {
          principal: {
            donde: 'Desarrollo › Equipos',
            texto: 'Entra al espacio de cada equipo para revisar y comentar sus metas y avances.',
          },
          tambien: [
            ...(actividad.configuracion?.bitacora_individual === 'habilitada'
              ? [
                  {
                    donde: 'Desarrollo › Equipos › Bitácoras',
                    texto: 'Lee la bitácora de cada participante.',
                  },
                ]
              : []),
            {
              donde: 'Desarrollo › Editar planificación',
              texto: 'Ajusta el calendario de entregas si hace falta.',
            },
          ],
          nota: actividad.fechaTermino
            ? `El cierre empieza solo al terminar el ${fecha(actividad.fechaTermino)}.`
            : undefined,
        }
      case 'cierre':
        return {
          principal: reconocimientos
            ? {
                donde: 'Cierre › Otorgar reconocimientos',
                texto: 'Reconoce lo que aportó cada participante.',
              }
            : { donde: 'Desarrollo › Equipos', texto: 'Revisa el trabajo final de cada equipo.' },
          tambien: [
            ...(reconocimientos
              ? [
                  {
                    donde: 'Desarrollo › Participantes',
                    texto: 'Revisa los reconocimientos que recibió cada quien.',
                  },
                ]
              : []),
            {
              donde: 'Cierre › Confirmar cierre de actividad',
              texto: 'Si ya terminó todo, archiva la actividad sin esperar la fecha.',
            },
          ],
          nota: fin
            ? reconocimientos
              ? `Se puede reconocer hasta el ${fecha(fin)}; luego la actividad se archiva sola.`
              : `La actividad se archiva sola al terminar el ${fecha(fin)}.`
            : undefined,
        }
      case 'archivada':
        return {
          principal: {
            texto: 'La actividad terminó. Puedes consultar todo, pero ya no modificarlo.',
          },
          tambien: [],
        }
    }
  }

  switch (actividad.fase) {
    case 'configuracion':
    case 'inscripcion':
      return {
        principal: {
          texto: actividad.fechaLimiteInscripcion
            ? `Espera a que cierre la inscripción, el ${fecha(actividad.fechaLimiteInscripcion)}. Después se forman los equipos.`
            : 'Espera a que cierre la inscripción. Después se forman los equipos.',
        },
        tambien: [{ texto: 'Mientras, lee el objetivo y la información general, aquí abajo.' }],
      }
    case 'formacion_equipos':
      return {
        principal: autogestionada
          ? actividad.idMiEquipo
            ? {
                donde: 'Creación › Conformación de equipos',
                texto: 'Ya tienes equipo. Espera a que todos tengan uno.',
              }
            : {
                donde: 'Creación › Conformación de equipos',
                texto: 'Únete a un equipo o crea uno con su nombre.',
              }
          : { texto: 'Quien organiza te asignará un equipo.' },
        tambien: [],
        nota: 'El desarrollo empieza cuando todos tienen equipo.',
      }
    case 'desarrollo':
      return {
        principal: actividad.idMiEquipo
          ? {
              donde: 'Desarrollo › Mi equipo',
              texto: 'Agrega con tu equipo las metas, los avances y los materiales.',
            }
          : { texto: 'Pide a quien organiza que te asigne un equipo.' },
        tambien:
          actividad.configuracion?.bitacora_individual === 'habilitada' && actividad.idMiEquipo
            ? [
                {
                  donde: 'Desarrollo › Mi bitácora',
                  texto: 'Escribe qué hiciste y qué se te dificultó.',
                },
              ]
            : [],
        nota: actividad.fechaTermino
          ? `El trabajo en equipo termina el ${fecha(actividad.fechaTermino)}.`
          : undefined,
      }
    case 'cierre':
      return {
        principal:
          reconocimientos && actividad.idMiEquipo
            ? {
                donde: 'Cierre › Otorgar reconocimientos',
                texto: 'Reconoce lo que aportó cada compañero.',
              }
            : { texto: 'Tu equipo ya no puede agregar contenido.' },
        tambien:
          reconocimientos && actividad.idMiEquipo
            ? [
                {
                  donde: 'Perfil › Insignias',
                  texto: 'Mira lo que te reconocieron tus compañeros.',
                },
              ]
            : [],
        nota: fin ? `Se puede reconocer hasta el ${fecha(fin)}.` : undefined,
      }
    case 'archivada':
      return {
        principal: {
          texto: 'La actividad terminó. Puedes consultar todo, pero ya no modificarlo.',
        },
        tambien: [],
      }
  }
  return null
}
