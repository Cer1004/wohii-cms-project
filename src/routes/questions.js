const express = require("express");
const router = express.Router();

const questions = require("../data/questions");
// GET /posts
// List all posts
// GET/api/questions/,/api/questions?keyword=http
router.get("/", (req, res) => {
    const{keyword} =req.query;
    if(!keyword){
       return res.json(questions);
    }
    const filteredQuestions = questions.filter(p=>p.keywords.includes(keyword));
    res.json(filteredQuestions);
});

//GET /api/questions/:postID 
router.get("/:questionID", (req, res) => {
    const questionID = Number(req.params.questionID);
    const question = questions.find(p=>p.id === questionID);
    if (!question){
        return res.status(404).json({msg: "Post not found"});
    }
    res.json(question);
     });
// QUESTION / api/questions
router.post("/", (req, res)=> {
    const {Question, answer, subject, keywords} =req.body;
    
    if (!Question || !answer || !subject){
    
        return res.status(400).json({
            msg:"question, answer and subject are required "
        });
    }
    const existingIds = questions.map(p=>p.id) // [1,2,3,4]
    const maxId = Math.max(...existingIds);
    const newQuestion = {
        id: questions.length ? maxId +1 : 1,
        Question, answer, subject,
        keywords: Array.isArray(keywords) ? keywords : []
    }
    questions.push(newQuestion);
    res.status(201).json(newQuestion);

});
//PUT  /api/question/:questionID
router.put("/:questionID", (req, res)=>{
    const questionID = Number(req.params.questionID);
    const question = questions.find(p=>p.id === questionID);
    if (!question){
        return res.status(404).json({msg: "Post not found"});
    }
    
    const {Question, answer, subject, keywords} =req.body;
    
    if (!Question || !answer || !subject){
    
        return res.status(400).json({
            msg:"Question, answer and subject are required "
        });
    }
    question.Question = Question;
    question.answer= answer;
    question.subject= subject;
    question.keywords = Array.isArray(keywords) ? keywords : [];

    res.json(question);

})

//DELETE /api/questions/:quiestionID
router.delete("/:questionId", (req, res)=>{
    const questionId = Number(req.params.questionId);
    const questionIndex= questions.findIndex(p=> p.id === questionId);

    if(questionIndex === -1){
        return res.status(404).json({msg: "Question not found"})
    } 
    const deletedQuestion = questions.splice(questionIndex, 1);
    res.json({
        msg:"Question deleted succesfully", 
        question: deletedQuestion
    });
});

module.exports = router;