import ReactDOM from "react-dom/client";
import App from "./App";
import { tryReloadForChunkError } from "./utils/lazyWithRetry";
import "./index.css";

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  tryReloadForChunkError();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <App />
);
