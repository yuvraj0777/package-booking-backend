import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const my_db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

(async () => {
  try {
    const connection = await my_db.getConnection();
    console.log("Database connected successfully !");
    connection.release();
  } catch (error) {
    console.log("Database connection failed !", error);
  }
})();

export default my_db;
