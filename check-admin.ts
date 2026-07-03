import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.adminUser.findFirst({ orderBy: { createdAt: "asc" }});
  console.log("Admin ID:", admin?.id, "Email:", admin?.email);
  if (admin) {
    const match = await bcrypt.compare("@212121@", admin.passwordHash);
    console.log("Match @212121@:", match);
  }
}

main();
