const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Seed Users
  const password = await bcrypt.hash("password123", 10); // Replace with secure password
  const user1 = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin User",
      password,
      role: "admin",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: "auditor@example.com",
      name: "Auditor User",
      password,
      role: "auditor",
    },
  });

  console.log("✅ Users seeded:", { user1, user2 });

  // Seed Organizations
  const org1 = await prisma.organization.create({
    data: {
      name: "Acme Corporation",
      members: {
        create: [
          { userId: user1.id, role: "admin" },
          { userId: user2.id, role: "auditor" },
        ],
      },
    },
  });

  console.log("✅ Organizations seeded:", { org1 });

  // Seed Rules
  const rules = await prisma.rule.createMany({
    data: [
      {
        rule_name: "High Value Transactions",
        field: "amount",
        operator: "GREATER_THAN",
        value: "100000",
        organizationId: org1.id,
      },
      {
        rule_name: "Transactions from US",
        field: "country",
        operator: "EQUAL",
        value: "US",
        organizationId: org1.id,
      },
    ],
  });

  console.log("✅ Rules seeded:", rules);

  // Seed Transactions
  const transaction1 = await prisma.transaction.create({
    data: {
      transaction_id: "txn_001",
      user_id: "user_001",
      amount: 150000,
      currency: "USD",
      country: "US",
      timestamp: new Date(),
      organizationId: org1.id,
    },
  });

  console.log("✅ Transactions seeded:", { transaction1 });

  // Seed Alerts
  const alert1 = await prisma.alert.create({
    data: {
      transaction_id: transaction1.transaction_id,
      reason: "Transaction flagged due to high value",
      organizationId: org1.id,
    },
  });

  console.log("✅ Alerts seeded:", { alert1 });

  // Seed Audit Logs
  const auditLog = await prisma.auditLog.create({
    data: {
      action: "Seeded initial data",
      userId: user1.id,
      organizationId: org1.id,
    },
  });

  console.log("✅ Audit logs seeded:", { auditLog });
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("🌱 Database seeding complete!");
  });
