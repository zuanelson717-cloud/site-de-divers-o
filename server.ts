import express from "express";
import path from "path";

async function startServer() {
  const app = express();

  // Render define PORT automaticamente
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // caminho seguro (SEM import.meta.url)
  const distPath = path.resolve("dist");

  app.use(express.static(distPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
  });
}

startServer();