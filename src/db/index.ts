import pkg from "pg";
import * as dotenv from "dotenv";
const { Pool } = pkg;
dotenv.config();

const pool = new Pool({
  user: process.env.PSQL_USER,
  password: process.env.PSQL_PASSWORD,
  host: process.env.PSQL_HOST,
  port: process.env.PSQL_PORT as number | undefined,
  database: process.env.PSQL_DATABASE,
  connectionString: process.env.PSQL_URL,
});

export default pool;
