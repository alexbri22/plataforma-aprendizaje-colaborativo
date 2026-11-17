import { sumaDePesosActivos } from '@plataforma/shared'
import { Badge } from '../../components/ui'

// Aviso de que lo que cuenta en un nivel no suma 100 (general §4.6). Quien lo
// usa lo muestra solo cuando la suma no es 100. No bloquea: los pesos se
// guardan uno a uno y la suma se descuadra entre un cambio y otro; mientras
// tanto el cálculo reparte en proporción.
export function AvisoSuma({ partes }: { partes: readonly { peso: number; apagado: boolean }[] }) {
  return <Badge variant="warning">Suman {sumaDePesosActivos(partes)} %, deben sumar 100 %</Badge>
}
