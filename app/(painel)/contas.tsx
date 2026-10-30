import { hojeSP } from "../../src/lib/format";
import { Contas } from "../../src/screens/Contas";

export default function ContasRota() {
  return <Contas hoje={hojeSP()} />;
}
