import express from "express";
import { createOrder, verifyPayment, getplans } from "../controllers/payment.js";

const routes = express.Router();
routes.get("/plans", getplans);
routes.post("/order", createOrder);
routes.post("/verify", verifyPayment);
export default routes;
