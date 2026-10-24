import "../global.css";

import { useFonts } from "expo-font";
import { Slot } from "expo-router";

// Os TTFs vêm de assets/fonts (nunca @expo-google-fonts); os nomes são os de tailwind.config.js.
export default function Raiz() {
  const [carregou, falhou] = useFonts({
    Inter_400Regular: require("../assets/fonts/Inter_400Regular.ttf"),
    Archivo_700Bold: require("../assets/fonts/Archivo_700Bold.ttf"),
    Archivo_800ExtraBold: require("../assets/fonts/Archivo_800ExtraBold.ttf"),
    DMMono_500Medium: require("../assets/fonts/DMMono_500Medium.ttf"),
  });
  if (!carregou && !falhou) return null;
  return <Slot />;
}
