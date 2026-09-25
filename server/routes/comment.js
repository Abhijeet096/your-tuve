import express from "express";
import {
  deletecomment,
  getallcomment,
  postcomment,
  editcomment,
  likecomment,
  dislikecomment,
  reportcomment,
  getflaggedcomments,
  reviewcomment,
  translatecomment,
} from "../controllers/comment.js";

const routes = express.Router();
routes.get("/flagged/all", getflaggedcomments);
routes.post("/translate", translatecomment);
routes.get("/:videoid", getallcomment);
routes.post("/postcomment", postcomment);
routes.delete("/deletecomment/:id", deletecomment);
routes.post("/editcomment/:id", editcomment);
routes.post("/like/:id", likecomment);
routes.post("/dislike/:id", dislikecomment);
routes.post("/report/:id", reportcomment);
routes.post("/review/:id", reviewcomment);
export default routes;
