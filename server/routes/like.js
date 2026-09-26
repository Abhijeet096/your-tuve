import express from "express";
import { handlelike, handledislike, likestatus, getallLikedVideo } from "../controllers/like.js";

const routes = express.Router();
routes.get("/status/:videoId", likestatus);
routes.get("/:userId", getallLikedVideo);
routes.post("/dislike/:videoId", handledislike);
routes.post("/:videoId", handlelike);
export default routes;
