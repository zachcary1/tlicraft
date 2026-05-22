import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import prisma from "../src/db/prisma";

type SkillEntry = {
  type: string;
  name: string;
  tags: string[];
  effect: string;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

async function main() {
  const filePath = path.join(process.cwd(), "data", "crafted", "torchcodex", "skill.json");
  const raw = await readFile(filePath, "utf8");
  const skills: SkillEntry[] = JSON.parse(raw);

  for (const skill of skills) {
    const id = slugify(skill.name);

    await prisma.skill.upsert({
      where: { id },
      update: {
        name: skill.name,
        type: skill.type,
        tags: skill.tags,
        effect: skill.effect,
      },
      create: {
        id,
        name: skill.name,
        type: skill.type,
        tags: skill.tags,
        effect: skill.effect,
      },
    });
  }

  console.log(`Imported ${skills.length} skills.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Skill import failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
