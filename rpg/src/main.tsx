import "@fontsource/cinzel/latin-400.css";
import "@fontsource/cinzel/latin-700.css";
import "@fontsource/crimson-text/latin-400.css";
import "@fontsource/crimson-text/latin-400-italic.css";
import "@fontsource/crimson-text/latin-600.css";
import "./index.css";
import { bootPlatform } from "./game/platform";

// Prima la piattaforma (Playgama Bridge: lingua, salvataggi, audio), poi il gioco:
// i testi vengono tradotti al caricamento dei moduli, quindi App si importa dopo.
(async () => {
  await bootPlatform(["krak_voci_sepolte_save", "krak_voci_sepolte_lang"]);
  const [{ default: React }, { default: ReactDOM }, { default: App }] = await Promise.all([import("react"), import("react-dom/client"), import("./App.tsx")]);
  ReactDOM.createRoot(document.getElementById("root")!).render(React.createElement(App));
})();
