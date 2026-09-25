import express from "express";
import { login, updateprofile, verifyotp, resendotp, updatetheme } from "../controllers/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.post("/verify-otp", verifyotp);
routes.post("/resend-otp", resendotp);
routes.patch("/update/:id", updateprofile);
routes.patch("/theme/:id", updatetheme);
export default routes;
