import { router } from "expo-router";

import { Entrar } from "../src/screens/Entrar";

export default function EntrarRota() {
  return <Entrar onEntrou={() => router.replace("/")} />;
}
