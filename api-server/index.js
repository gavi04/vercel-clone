require("dotenv").config();

const express = require("express");
const { generateSlug } = require("random-word-slugs");
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs");
const Valkey = require("ioredis");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const verifyToken = require("./middleware/verifyToken");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const app = express();
const PORT = 9000;
const SOCKET_PORT = 9001;

app.use(express.json());

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

const prisma = new PrismaClient();

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const serviceUri = process.env.SERVICE_URL;
const subnets = process.env.SUBNETS?.split(',') || [];
const securityGroups = process.env.SECURITY_GROUPS?.split(',') || [];

const valkey = new Valkey(serviceUri);
const activeQueues = new Set();

const client = new ECSClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
});

const config = {
  CLUSTER: process.env.CLUSTER,
  TASK: process.env.TASK,
};

// Socket.IO setup
const io = new Server({
  cors: "*"
});

io.on("connection", (socket) => {
  socket.on("subscribe", (projectId) => {
    socket.join(projectId);
    socket.emit("message", `joined ${projectId}`);
    pullMessages(projectId);
  });
});

async function pullMessages(projectId) {
  if (activeQueues.has(projectId)) return;
  activeQueues.add(projectId);

  const redis = new Valkey(serviceUri);
  console.log(`Started listening to Redis queue: ${projectId}`);

  while (true) {
    try {
      const result = await redis.brpop(projectId, 0);
      const message = result[1];
      console.log(`[${projectId}] ${message}`);

      io.to(projectId).emit("log", message);
    } catch (err) {
      console.error(`Error in Redis pull for ${projectId}:`, err);
      break;
    }
  }

  redis.disconnect();
}

// Database operation
async function addToProjectTable(userId, projectSlug) {
  try {
    return await prisma.projects.create({
      data: {
        ownerId: userId,
        name: projectSlug,
      },
    });
  } catch (error) {
    console.error("Failed to add project:", error);
    throw new Error("DB error");
  }
}

// Routes
app.post("/project", verifyToken, async (req, res) => {
  const projectSlug = generateSlug();
  const userId = req.userId;
  const gitUrl = req.body.gitUrl;

  if (!userId) {
    return res.status(403).json({ error: "No userId from token" });
  }

  const command = new RunTaskCommand({
    cluster: config.CLUSTER,
    taskDefinition: config.TASK,
    launchType: "FARGATE",
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: "ENABLED",
        subnets,
        securityGroups
      }
    },
    overrides: {
      containerOverrides: [
        {
          name: "builder-image",
          environment: [
            { name: "GIT_REPOSITORY_URL", value: gitUrl },
            { name: "PROJECT_ID", value: projectSlug },
            { name: "AccessKeyId", value: process.env.ACCESS_KEY_ID },
            { name: "SecretAccessKey", value: process.env.SECRET_ACCESS_KEY }
          ]
        }
      ]
    }
  });

  try {
    await client.send(command);
    await addToProjectTable(userId, projectSlug);

    return res.json({
      status: "queued",
      data: { projectSlug, url: `http://${projectSlug}.localhost:8000/` }
    });
  } catch (err) {
    console.error("Deployment failed:", err);
    return res.status(500).json({ error: "Failed to deploy project" });
  }
});

app.get("/api/projects", verifyToken, async (req, res) => {
  try {
    const { userId } = req;
    const projects = await prisma.projects.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true }
    });

    res.json({ projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return res.status(400).json({ error: "Name, email, or password is missing" });
  }

  try {
    const newUser = await prisma.user.create({
      data: { name, email, password }, // In production, hash the password
    });

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: "1d" });
    res.status(201).json({ user: newUser, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password?.trim()) {
    return res.status(400).json({ error: "Email or password is missing" });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (!existingUser || existingUser.password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: existingUser.id }, JWT_SECRET, { expiresIn: "1d" });
    res.status(200).json({ message: "Signin successful", user: existingUser, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start servers
io.listen(SOCKET_PORT, () => {
  console.log(`Socket server running on port ${SOCKET_PORT}`);
});

app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});
