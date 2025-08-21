import { Router } from "express";
import { chatRouter } from "./chat";
import { modelsRouter } from "./models";
import { carbonRouter } from "./carbon";
import { routeRouter } from "./route";
import { presenceRouter } from "./presence";

export const v1Router = Router();

// API v1 routes
v1Router.use("/chat", chatRouter);
v1Router.use("/models", modelsRouter);
v1Router.use("/carbon", carbonRouter);
v1Router.use("/route", routeRouter);
v1Router.use("/presence", presenceRouter);

// Health check endpoint for v1
v1Router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    version: "v1",
    timestamp: new Date().toISOString(),
  });
});
