const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..","..","public","uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const newName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
    cb(null, newName)
  }
})

const upload = multer ({
  storage,
  fileFilter: (req, file, cb) => {
    if ( file.mimetype.startsWith("image")){
      cb(null, true)
    } else {
      cb(new Error("Only images allowed"))
    }
  },
  limits: {fileSize: 5 * 1024 * 1024}
})


function formatQuestion(question) {
  return {
    ...question,
    subject: question.subject,
    keywords: question.keywords.map((k) => k.name),
    userName: question.user ? question.user.name : null, 
    liked: question.likes ? question.likes.length > 0 : false,
    likeCount: question._count?.likes ?? 0,
    solved: question.play?.[0]?.solved || false,
    user: undefined,
    _count: undefined,
    likes: undefined, 
    play: undefined
  };
}

router.use(authenticate);


// GET/api/questions/,/api/questions?keyword=http&page=1&limit=5
router.get("/", async (req, res) => {
  const { keyword } = req.query;

  const where = keyword ?
   { keywords: { some: { name: keyword } } }: {};

    const page= Math.max(1,parseInt(req.query.page) || 1 );
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5 ));
    const skip= (page-1)*limit;

  const [filteredQuestions, total] = await Promise.all([prisma.question.findMany({
    where,
    include: { 
      keywords: true, 
      user: true,
      likes: {where: {userId: req.user.userId }, take: 1},
      _count: {select: {likes: true }},
       play: {where: { userId: req.user.userId },take: 1
  }
    },
    orderBy: { id: "asc" },
    skip, 
    take: limit
  }),prisma.question.count({where})]);

  res.json({
    data: filteredQuestions.map(formatQuestion),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  })
});


//GET /api/questions/:questionID 
router.get("/:questionID", async (req, res) => {
   const questionID = Number(req.params.questionID);
   const question = await prisma.question.findUnique({
     where: { id: questionID },
     include: { 
      keywords: true, 
      user: true,
      likes: { where: { userId: req.user.userId }, take: 1 },
      _count: { select: { likes: true } },
      play: {where: { userId: req.user.userId },take: 1
    },
  }
  });

  if (!question) {
    return res.status(404).json({ 
		message: "Question not found" 
    });
  }
  res.json(formatQuestion(question));
});

  
// POST / QUESTION / api/questions
router.post("/", upload.single("image"), async (req, res)=> {
    const {question, answer, subject, keywords} =req.body;
    
    if (!question || !answer || !subject){
    
        return res.status(400).json({
            msg:"question, answer and subject are required "
        });
    }
const keywordsArray = keywords.split(",").map(k => k.trim()).filter(Boolean);
const imageUrl = req.file ? `/uploads/${req.file.filename}`:null;
const newQuestion = await prisma.question.create({
    data: {
      question, 
      answer, 
      subject,
      userId: req.user.userId,
      imageUrl,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw }, create: { name: kw },
        })), },
    },
    include: { 
      keywords: true},
  });

  res.status(201).json(formatQuestion(newQuestion));
});

// PUT /api/questions/:questionID
router.put("/:questionID", isOwner, upload.single("image"), async (req, res)=>{
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
    const imageUrl = req.file ? `/uploads/${req.file.filename}`:null;
    const keywordsArray = keywords.split(",").map(k => k.trim()).filter(Boolean);
    const updatedQuestion = await prisma.question.update({
      where: { id: questionID },
      data: {
        question, 
        answer, 
        subject,
        imageUrl,
        keywords: {
         set: [],
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      },
    },
    include: { 
      keywords: true,
      user: true,
      likes: { where: { userId: req.user.userId }, take: 1 },
      _count: { select: { likes: true } },
     },
  });
  res.json(formatQuestion(updatedQuestion));
});


//DELETE /api/questions/:questionID
router.delete("/:questionID", isOwner, async (req, res)=>{
    const questionID = Number(req.params.questionID);
    const question = await prisma.question.findUnique({
    where: { id: questionID },
    include: { 
      keywords: true,
      user: true,
      likes: { where: { userId: req.user.userId }, take: 1 },
      _count: { select: { likes: true } }, 
    },
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


// POST /api/questions/:questionId/like
router.post("/:questionId/like", async (req, res) => {
  const questionId = Number(req.params.questionId);
  const question = await prisma.question.findUnique({where: {id: questionId}});
  if (!question){
    return res.status(404).json({ message: "Question not found" });
  }
  const like = await prisma.like.upsert({
    where: {userId_questionId: {userId: req.user.userId, questionId}},
    update: {},
    create: {userId: req.user.userId, questionId}
  });

  const likeCount = await prisma.like.count({where: {questionId}})

  res.status(201).json({
  id: like.id,
  questionId,
  liked: true,
  likeCount,
  createdAt: like.createdAt
  });
});

// DELETE /api/questions/:questionId/like
router.delete("/:questionId/like", async (req, res) => {
  const questionId = Number(req.params.questionId);
  const question = await prisma.question.findUnique({where: {id: questionId}});
  if (!question){
    return res.status(404).json({ message: "Question not found" });
  }
  const like = await prisma.like.deleteMany({
    where: {userId: req.user.userId, questionId}
  });

  const likeCount = await prisma.like.count({where: {questionId}})

  res.json({
  questionId,
  liked: false,
  likeCount
  });
});

   ///api/questions/:qId/play
  router.post("/:questionId/play", async (req, res) => {
  const questionId = Number(req.params.questionId);
  const { answer } = req.body;

  const question = await prisma.question.findUnique({
    where: { id: questionId }
  });

  if (!question) {
    return res.status(404).json({ msg: "question not found" });
  }

  const correct = question.answer === answer;

  await prisma.play.upsert({
    where: {
      userId_questionId: {
        userId: req.user.userId,
        questionId
      }
    },
    update: { solved: correct },
    create: {
      userId: req.user.userId,
      questionId,
      solved: correct
    }
  });

  res.json({
    correct,
    correctAnswer: question.answer
  });
});

module.exports = router;