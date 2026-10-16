import { hojeSP } from "../../src/lib/format";
import { Campanhas } from "../../src/screens/Campanhas";

export default function CampanhasRota() {
  return <Campanhas hoje={hojeSP()} />;
}
