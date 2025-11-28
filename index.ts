import "dotenv/config";
import { sync } from "./src/sync";

sync().then(() => {
  console.log("Done.");
});