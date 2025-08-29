import express from "express";
import cors from "cors";
import "dotenv/config";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import aiRouter from "./routes/aiRoutes.js";
import connectCloudinary from "./configs/cloudinary.js";
import userRouter from "./routes/userRoutes.js";

const app = express();

await connectCloudinary();

app.use(cors({
  origin: [
    "https://my-ai-tools-seven.vercel.app", // frontend origin
    "http://localhost:3000" // local dev
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());
app.use(clerkMiddleware());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Server is Live!");
});
app.use(requireAuth());

app.use("/api/ai", aiRouter);
app.use('/api/user', userRouter)

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
