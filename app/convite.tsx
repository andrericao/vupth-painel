import { router, useLocalSearchParams } from "expo-router";

import { Convite } from "../src/screens/Convite";

export default function ConviteRota() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  return <Convite token={token} onEntrar={() => router.replace("/entrar")} />;
}
