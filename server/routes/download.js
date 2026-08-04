import express from "express";
import {
  getalldownloads,
  getdownloadstatus,
  handledownload,
  updateplan,
} from "../controllers/download.js";

const routes = express.Router();
routes.get("/status/:userId", getdownloadstatus);
routes.get("/:userId", getalldownloads);
routes.post("/:videoId", handledownload);
routes.patch("/plan/:userId", updateplan);
export default routes;
