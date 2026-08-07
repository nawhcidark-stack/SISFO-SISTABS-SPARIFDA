const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

const candidates = [
  "mongodb+srv://portalinspiratif_db_user:Sparifda%4020519113@cluster0.0hekxl2.mongodb.net/spp_maarif?retryWrites=true&w=majority",
  "mongodb+srv://portalinspiratif_db_user:Sparifda20519113@cluster0.0hekxl2.mongodb.net/spp_maarif?retryWrites=true&w=majority"
];

const csvData = fs.readFileSync("restore_savings.cjs", "utf8");
const match = csvData.match(/const csvData = `([\s\S]*?)`;/);
if (!match) {
  console.error("Failed to parse CSV");
  process.exit(1);
}

const rawCsv = match[1];
const nisMap = {};
rawCsv.trim().split("\n").forEach(line => {
  const parts = line.split(",");
  if (parts.length >= 5) {
    const nis = parts[1].trim();
    const balance = parseInt(parts[4].trim(), 10);
    if (nis && !isNaN(balance)) {
      nisMap[nis] = balance;
    }
  }
});

async function main() {
  for (const uri of candidates) {
    let client;
    try {
      client = new MongoClient(uri);
      await client.connect();
      const db = client.db("spp_maarif");
      const col = db.collection("students");
      
      const allStudents = await col.find({}).toArray();
      console.log(`Connected to MongoDB. Found ${allStudents.length} students in DB.`);
      
      let updatedCount = 0;
      let negativeCount = 0;

      for (const st of allStudents) {
        const nis = String(st.nis || "").trim();
        if (nisMap.hasOwnProperty(nis)) {
          const targetBalance = nisMap[nis];
          await col.updateOne(
            { _id: st._id },
            { $set: { savingsBalance: targetBalance } }
          );
          updatedCount++;
          if (targetBalance < 0) negativeCount++;
        }
      }

      console.log(`Successfully synced MongoDB: updated ${updatedCount} students (${negativeCount} with negative balance).`);
      await client.close();
      return;
    } catch (e) {
      console.warn("MongoDB connection failed for candidate:", e.message);
      if (client) await client.close().catch(() => {});
    }
  }
}

main().catch(console.error);
