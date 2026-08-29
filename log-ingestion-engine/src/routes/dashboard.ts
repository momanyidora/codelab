import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/", (req, res) => {
  try {
    const htmlPath = path.join(__dirname, "../dashboard/dashboard.html");

    const html = fs.readFileSync(htmlPath, "utf8");

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error) {
    console.error("Error serving dashboard:", error);

    res.status(500).send(`
      <html>
        <body>
          <h1>Error loading dashboard</h1>
          <p>
            ${error instanceof Error ? error.message : "Unknown error"}
          </p>
        </body>
      </html>
    `);
  }
});

export default router;
