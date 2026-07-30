# lib/

Cliente HTTP y utilidades transversales que no pertenecen a una feature
específica (ver sección 3.5 de `docs/diseno-desarrollo-general.md`).

**Estado:** pendiente de implementación. El cliente HTTP (wrapper sobre
`fetch` hacia `apps/api`, con manejo de sesión y errores) se añade cuando la
primera feature lo necesite — no antes.
