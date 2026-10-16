import { EsperaBackend } from "../../src/components/EsperaBackend";
import { PREVIAS } from "../../src/screens/previas";

export default function Tela() {
  return <EsperaBackend previa={PREVIAS.estabelecimentos} />;
}
