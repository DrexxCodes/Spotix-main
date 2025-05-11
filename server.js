import Fastify from "fastify"
import fastifyCors from "@fastify/cors"
import fastifyStatic from "@fastify/static"
import { fileURLToPath } from "url"
import path from "path"
import { dirname } from "path"
import fs from "fs"
import dotenv from "dotenv"

// Import route handlers
import enhanceRoute from "./api/gemini/enhance.js"
import paymentRoute from "./api/payment.js"
import webhookRoute from "./api/webhook.js"
import verifyRoute from "./api/verify.js"
import sendMailRoutes from "./api/mail.js"

// Configure dotenv
dotenv.config()

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Initialize Fastify app
const fastify = Fastify({
  logger: true,
})

// Register CORS plugin with specific configuration for development
await fastify.register(fastifyCors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) {
      cb(null, true)
      return
    }

    // Allow requests from localhost on any port
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
      cb(null, true)
      return
    }

    // Default deny
    cb(new Error("Not allowed"), false)
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
})

// Basic route to test server
fastify.get("/api/test", async (request, reply) => {
  return { message: "Server is working!" }
})

// Register API routes before static file handling
fastify.register(enhanceRoute, { prefix: "/api/gemini" })
fastify.register(paymentRoute, { prefix: "/api" })
fastify.register(webhookRoute, { prefix: "/api/payment" })
fastify.register(verifyRoute, { prefix: "/api" })
fastify.register(sendMailRoutes, { prefix: "/api/mail" })

// Check if dist directory exists before registering static plugin
const distPath = path.join(__dirname, "dist")
if (fs.existsSync(distPath)) {
  // Register static file handler with options to avoid conflicts
  await fastify.register(fastifyStatic, {
    root: distPath,
    prefix: "/",
    decorateReply: false,
  })

  // Use a preHandler hook instead of a catch-all route
  fastify.setNotFoundHandler((request, reply) => {
    // Don't handle API routes with this handler
    if (request.url.startsWith("/api/")) {
      return reply.code(404).send({ error: "API route not found" })
    }
    // For non-API routes, serve the index.html
    return reply.sendFile("index.html")
  })
}

// Start the server the fastify way not with that rubbish express
const start = async () => {
  try {
    const PORT = process.env.PORT || 5000
    await fastify.listen({ port: PORT, host: "0.0.0.0" })
    console.log(`Server running on port ${PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
