import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { routerBasename } from "./lib/labPaths";
import "./index.css";

const basename = routerBasename();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename === "/" ? undefined : basename}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
