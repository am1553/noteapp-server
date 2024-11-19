import * as dotenv from "dotenv";
import app from "./app";

dotenv.config();

app.listen(process.env.SERVER_PORT || 8080, () => {
  console.log("SERVER STARTED ON PORT: ", process.env.SERVER_PORT);
  return "Hello";
});
