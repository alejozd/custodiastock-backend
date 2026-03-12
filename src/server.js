import app from "./app.js";
import { ensureAdminUser } from "./seed/adminSeed.js";

const PORT = process.env.PORT || 3000;

await ensureAdminUser();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
