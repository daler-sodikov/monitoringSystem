const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const { MONGO_URL } = process.env;
const DB_NAME = process.env.DB_NAME || "testplatform";

const ADMIN_EMAIL = "admin@test.com";
const ADMIN_PASSWORD = "admin123";

if (!MONGO_URL) {
  console.error("MONGO_URL is not defined in .env");
  process.exit(1);
}

async function createAdmin() {
  const client = new MongoClient(MONGO_URL);

  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db(DB_NAME);

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const existing = await db.collection("users").findOne({ email: ADMIN_EMAIL });

    if (existing) {
      await db.collection("users").updateOne(
        { email: ADMIN_EMAIL },
        { $set: { password: hashedPassword, role: "ADMIN" } }
      );
      console.log("Existing admin user updated.");
    } else {
      await db.collection("users").insertOne({
        name: "Admin User",
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: "ADMIN",
        createdAt: new Date(),
      });
      console.log("Admin user created.");
    }

    console.log(`Credentials: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createAdmin();
