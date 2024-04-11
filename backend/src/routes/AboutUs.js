const express = require("express");
const aboutUsController = require("../controllers/AboutUsController");
const aboutUsRouter = express.Router();

aboutUsRouter.get("/", aboutUsController.get);
aboutUsRouter.get("/:id", aboutUsController.find);
aboutUsRouter.post("/", aboutUsController.create);
aboutUsRouter.put("/:id", aboutUsController.update);
aboutUsRouter.delete("/:id", aboutUsController.delete);

module.exports = aboutUsRouter;