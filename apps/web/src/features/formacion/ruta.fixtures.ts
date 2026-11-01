/*
 * Ruta destacada del Centro de formación (docs/diseno-desarrollo-formacion.md
 * §4.1), tal como la muestra el diseño de la pantalla. Las rutas todavía no
 * tienen tablas ni API: son el paso siguiente a los cursos. Hasta entonces se
 * muestra como vista previa editorial, sin enlaces.
 */

export const RUTA_DESTACADA = {
  titulo: 'Comunicación y confianza',
  descripcion:
    'Tres pasos para expresar ideas con claridad, escuchar con atención y ofrecer retroalimentación útil.',
  pasos: [
    { titulo: 'Comunicación clara en equipos', detalle: '30 min · Inicial' },
    { titulo: 'Escucha activa y preguntas útiles', detalle: '25 min · Inicial' },
    { titulo: 'Retroalimentación que ayuda a mejorar', detalle: '35 min · Intermedio' },
  ],
}
