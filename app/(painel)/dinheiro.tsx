import { hojeSP } from "../../src/lib/format";
import { Dinheiro } from "../../src/screens/Dinheiro";

export default function DinheiroRota() {
  return <Dinheiro hoje={hojeSP()} />;
}
