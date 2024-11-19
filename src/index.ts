import * as dotenv from "dotenv";
import app from "./app";

dotenv.config();

console.log(process.env.SERVER_PORT);

app.listen(process.env.SERVER_PORT || 8080, () => {
  console.log("SERVER STARTED ON PORT: ", process.env.SERVER_PORT);
  return "Hello";
});
