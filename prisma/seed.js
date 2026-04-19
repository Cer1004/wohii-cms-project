const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedQuestions = [
  {
    question: "3+3",
    answer: "6",
    subject: "Math",
    keywords: ["math", "addition"]
  },
  {
    question: "What is the date of independence of Finland ?",
    answer: "December 6 1917",
    subject: "History",
    keywords: ["Finland", "independence"]
  },
  {
    question: "What is the capital of Hawaii ?",
    answer: "Honolulu",
    subject: "Geography",
    keywords: ["Capital", "Geography"]
  },
  {
    question: "Who painted La Joconde (Mona Lisa)",
    answer: "Leonardo da Vinci",
    subject: "Art",
    keywords: ["Art", "painting"]
  },
];

async function main() {
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();

  for (const question of seedQuestions) {
    await prisma.question.create({
      data: {
        question: question.question,
        answer: question.answer,
        subject: question.subject,
        keywords: {
          connectOrCreate: question.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
