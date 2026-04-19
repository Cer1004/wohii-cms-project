const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");


function formatQuestion(question) {
  return {
    ...question,
    subject: question.subject,
    keywords: question.keywords.map((k) => k.name),
  };
}

// GET/api/questions/,/api/questions?keyword=http
router.get("/", async (req, res) => {
  const { keyword } = req.query;

  const where = keyword
    ? { keywords: { some: { name: keyword } } }
    : {};

  const questions = await prisma.question.findMany({
    where,
    include: { keywords: true },
    orderBy: { id: "asc" },
  });

  res.json(questions.map(formatQuestion));
});


//GET /api/questions/:questionID 
router.get("/:questionID", async (req, res) => {
   const questionID = Number(req.params.questionID);
   const question = await prisma.question.findUnique({
     where: { id: questionID },
     include: { keywords: true },
  });

  if (!question) {
    return res.status(404).json({ 
		message: "Question not found" 
    });
  }

  res.json(formatQuestion(question));
});

  
// QUESTION / api/questions
router.post("/", async (req, res)=> {
    const {question, answer, subject, keywords} =req.body;
    
    if (!question || !answer || !subject){
    
        return res.status(400).json({
            msg:"question, answer and subject are required "
        });
    }
const keywordsArray = Array.isArray(keywords) ? keywords : [];

  const newQuestion = await prisma.question.create({
    data: {
      question, 
      answer, 
      subject,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw }, create: { name: kw },
        })), },
    },
    include: { keywords: true },
  });

  res.status(201).json(formatQuestion(newQuestion));
});

//PUT  /api/question/:questionID
router.put("/:questionID", async (req, res)=>{
    const questionID = Number(req.params.questionID);
    const { question, answer, subject, keywords } = req.body;
    const existingQuestion = await prisma.question.findUnique({where: {id: questionID}});

    if (!existingQuestion){
        return res.status(404).json({msg: "Question not found"});
    } 
    
    if (!question || !answer || !subject){
            return res.status(400).json({
            msg:"Question, answer and subject are required "
        });
    }
    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    const updatedQuestion = await prisma.question.update({
      where: { id: questionID },
      data: {
        question, 
        answer, 
        subject,
        keywords: {
         set: [],
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      },
    },
    include: { keywords: true },
  });
  res.json(formatQuestion(updatedQuestion));
});


//DELETE /api/questions/:questionID
router.delete("/:questionID", async (req, res)=>{
    const questionID = Number(req.params.questionID);
    const question = await prisma.question.findUnique({
    where: { id: questionID },
    include: { keywords: true },
  });

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  await prisma.question.delete({ where: { id: questionID } });

  res.json({
    message: "Question deleted successfully",
    question: formatQuestion(question),
  });
});


module.exports = router;