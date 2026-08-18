# Emblemas de las insignias

Un PNG por cada combinación de categoría y nivel. Cada archivo es el **emblema**
—el disco que va dentro del marco—, no la insignia completa: el marco del rango
lo pone `MarcoRango` por encima, en capas.

## Estructura

Una subcarpeta por categoría, el nivel como nombre de archivo:

```
assets/insignias/
├── liderazgo/
├── companerismo/
├── comunicacion/
├── compromiso/
├── ideas/
└── buen-juicio/
```

y dentro de cada una, seis archivos, en cualquiera de estas dos formas:

```
bronce.png                   liderazgo_bronce.png
plata.png                    liderazgo_plata.png
oro.png            — o —     liderazgo_oro.png
platino.png                  liderazgo_platino.png
diamante.png                 liderazgo_diamante.png
```

La segunda repite el nombre de la carpeta como prefijo. Dentro del árbol es
redundante, pero fuera de él —en una descarga, en una pestaña del editor, en un
adjunto de chat— es la diferencia entre un archivo que se identifica solo y seis
llamados `bronce.png`. Puedes mezclar ambas formas.

**Si el prefijo no coincide con su carpeta, el archivo no se carga** y aparece
listado en `/insignias` como mal colocado. Aceptarlo lo colgaría de la categoría
equivocada sin que nada lo señale: `liderazgo/comunicacion_bronce.png` se leería
como el bronce de liderazgo.

**30 archivos en total.** El estado sin rango no lleva arte: una categoría
todavía no ganada se dibuja con el hueco punteado del marco y el emblema
vectorial en gris. Un `sin-rango.png` heredado de la versión anterior no se
carga y aparece listado en `/insignias`.

## Nombres

Los nombres de carpeta son **exactamente** los identificadores de categoría de
`packages/shared/src/insignias.ts`, y los de archivo los de nivel. Sin acentos,
sin eñes, en minúsculas: `companerismo`, no `compañerismo`; `comunicacion`, no
`comunicación`. El archivo se resuelve directo desde el identificador del
dominio, así que un nombre que no coincida simplemente no se encuentra.

Dos razones para el ASCII, más allá del gusto: evita una tabla de traducción
entre identificador y archivo, y evita que macOS y Linux normalicen la eñe
distinto y Git termine viendo dos archivos donde hay uno.

## Requisitos de los archivos

- **Transparencia real.** Un fondo cuadriculado _dibujado_ no es transparencia:
  si el PNG no trae canal alfa, la insignia sale con un tablero gris encima. Ya
  pasó con los marcos de la primera versión. Verifícalo antes de commitear.
- **Sin margen transparente.** El emblema debe llenar su lienzo: el marco le
  reserva una abertura y lo estira hasta llenarla, así que un archivo con 15 % de
  aire alrededor se ve 15 % más chico que sus hermanos. Recorta al contenido y
  rellena a cuadrado.
- **Alto uniforme,** idealmente 320 px antes de recortar. Los archivos ya
  procesados rondan los 272 px de lado.
- **Comprimidos.** `pngquant --quality=65-92` deja estas imágenes en torno a los
  30 KB sin pérdida visible. Son 30 archivos: sin comprimir se van a varios MB.

Para verificar un lote antes de commitear:

```bash
python3 -c "
from PIL import Image; import glob, sys
for f in sorted(glob.glob('apps/web/src/features/insignias/assets/insignias/*/*.png')):
    im = Image.open(f).convert('RGBA')
    alfa = min(im.getchannel('A').get_flattened_data())
    print(f'{f.split(\"insignias/\")[-1]:32s} {str(im.size):12s} alfa_min={alfa}')
"
```

`alfa_min` distinto de 0 significa que ese archivo no tiene ni un píxel
transparente, es decir, que no está recortado.

## Estado

Las 30 piezas están. Una prueba lo fija, así que borrar o renombrar un archivo
rompe CI en vez de degradar la insignia en silencio.

Si agregas o reemplazas alguno, corre el bucle de arriba y revisa `/insignias`:
lista lo que falta, lo que no se carga por nombre inválido y los pares que
compiten por el mismo emblema.

El marco y el emblema vectorial **no son provisionales**: el marco se usa
siempre, y el vectorial es el emblema permanente del estado sin rango.
