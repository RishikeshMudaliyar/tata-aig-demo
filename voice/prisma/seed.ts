import { PrismaClient } from "@prisma/client";
import { seedAll } from "../src/lib/seed";

const db = new PrismaClient();

seedAll(db)
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
