import * as dotenv from "dotenv";
import app from "./app";

dotenv.config();
const PORT : string | undefined = process.env.SERVER_PORT;

if(!PORT) {
  console.error("PORT COULDN'T BE FOUND.")
}

app.listen(PORT, () => {
  console.log("SERVER STARTED ON PORT: ", PORT);
  return "Hello";
});
