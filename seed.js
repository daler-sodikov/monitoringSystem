const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const { MONGO_URL } = process.env;
const DB_NAME = process.env.DB_NAME || "testplatform";

if (!MONGO_URL) {
  console.error("MONGO_URL is not defined in .env");
  process.exit(1);
}

async function seed() {
  const client = new MongoClient(MONGO_URL);

  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db(DB_NAME);

    // Clear existing data
    console.log("Clearing existing data...");
    await db.collection("users").deleteMany({});
    await db.collection("tests").deleteMany({});
    await db.collection("variants").deleteMany({});
    await db.collection("questions").deleteMany({});
    await db.collection("options").deleteMany({});
    await db.collection("matchingpairs").deleteMany({});
    await db.collection("rooms").deleteMany({});
    await db.collection("roomstudents").deleteMany({});
    await db.collection("answers").deleteMany({});
    await db.collection("results").deleteMany({});

    // Create Users
    console.log("Creating users...");
    const hashedAdminPassword = await bcrypt.hash("admin123", 10);
    const hashedTeacherPassword = await bcrypt.hash("teacher123", 10);
    const hashedStudentPassword = await bcrypt.hash("student123", 10);

    const admin = await db.collection("users").insertOne({
      name: "Admin User",
      email: "admin@test.com",
      password: hashedAdminPassword,
      role: "ADMIN",
      createdAt: new Date(),
    });
    console.log("admin@test.com, admin123")

    const teacher = await db.collection("users").insertOne({
      name: "Teacher User",
      email: "teacher@test.com",
      password: hashedTeacherPassword,
      role: "TEACHER",
      createdAt: new Date(),
    });

    const student = await db.collection("users").insertOne({
      name: "Student User",
      email: "student@test.com",
      password: hashedStudentPassword,
      role: "STUDENT",
      createdAt: new Date(),
    });

    const teacherId = teacher.insertedId.toString();

    // Create a Test
    console.log("Creating test...");
    const test = await db.collection("tests").insertOne({
      title: "General Knowledge Test",
      description: "A basic test covering math and geography",
      teacherId: teacherId,
      createdAt: new Date(),
    });

    const testId = test.insertedId.toString();

    // Create Variant A
    const variantA = await db.collection("variants").insertOne({
      testId: testId,
      name: "Variant A",
      createdAt: new Date(),
    });

    const variantAId = variantA.insertedId.toString();

    // Questions for Variant A
    // 1. Multiple Choice
    const q1A = await db.collection("questions").insertOne({
      variantId: variantAId,
      text: "What is the capital of France?",
      type: "MULTIPLE_CHOICE",
      order: 1,
      points: 1,
      createdAt: new Date(),
    });

    const q1AId = q1A.insertedId.toString();
    await db.collection("options").insertMany([
      { questionId: q1AId, text: "London", isCorrect: false },
      { questionId: q1AId, text: "Paris", isCorrect: true },
      { questionId: q1AId, text: "Berlin", isCorrect: false },
      { questionId: q1AId, text: "Madrid", isCorrect: false },
    ]);

    // 2. Matching
    const q2A = await db.collection("questions").insertOne({
      variantId: variantAId,
      text: "Match countries with their capitals",
      type: "MATCHING",
      order: 2,
      points: 2,
      createdAt: new Date(),
    });

    const q2AId = q2A.insertedId.toString();
    await db.collection("matchingpairs").insertMany([
      { questionId: q2AId, left: "Italy", right: "Rome" },
      { questionId: q2AId, left: "Japan", right: "Tokyo" },
      { questionId: q2AId, left: "Canada", right: "Ottawa" },
    ]);

    // 3. Open Question
    await db.collection("questions").insertOne({
      variantId: variantAId,
      text: "Explain why the sky is blue.",
      type: "OPEN",
      order: 3,
      points: 5,
      createdAt: new Date(),
    });

    // Create Variant B
    const variantB = await db.collection("variants").insertOne({
      testId: testId,
      name: "Variant B",
      createdAt: new Date(),
    });

    const variantBId = variantB.insertedId.toString();

    // Questions for Variant B
    const q1B = await db.collection("questions").insertOne({
      variantId: variantBId,
      text: "What is 5 + 7?",
      type: "MULTIPLE_CHOICE",
      order: 1,
      points: 1,
      createdAt: new Date(),
    });

    const q1BId = q1B.insertedId.toString();
    await db.collection("options").insertMany([
      { questionId: q1BId, text: "10", isCorrect: false },
      { questionId: q1BId, text: "11", isCorrect: false },
      { questionId: q1BId, text: "12", isCorrect: true },
      { questionId: q1BId, text: "13", isCorrect: false },
    ]);

    console.log("Seeding completed successfully!");
    console.log("Teacher Credentials: teacher@test.com / teacher123");
    console.log("Student Credentials: student@test.com / student123");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await client.close();
  }
}

seed();
