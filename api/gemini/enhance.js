// enhanceRoute.js
import axios from "axios"
import { z } from "zod"

const eventSchema = z.object({
  eventName: z.string().min(1, "Event name is required"),
  eventDescription: z.string().min(1, "Event description is required"),
  eventDate: z.string().min(1, "Event date is required"),
  eventVenue: z.string().min(1, "Event venue is required"),
  eventType: z.string().min(1, "Event type is required"),
})

export default async function enhanceRoute(fastify, options) {
  fastify.post("/enhance", async (request, reply) => {
    try {
      // Log incoming body
      request.log.info("Received request body:", request.body)

      // Validate request body using Zod
      const validation = eventSchema.safeParse(request.body)

      if (!validation.success) {
        request.log.warn("Validation failed:", validation.error)
        return reply.code(400).send({
          error: "Validation failed",
          issues: validation.error.errors.map(e => ({
            field: e.path[0],
            message: e.message,
          })),
        })
      }

      const { eventName, eventDescription, eventDate, eventVenue, eventType } = validation.data

      const prompt = `
Rewrite this event description to be more professional, engaging, and exciting. It should be about 200 words long.

Event Name: ${eventName}
Event Type: ${eventType}
Event Date: ${eventDate}
Event Venue: ${eventVenue}
Original Description: "${eventDescription}"

Enhanced Description:
      `

      // Log prompt being sent to Hugging Face
      request.log.info("Sending prompt to Hugging Face API...")
      request.log.debug("Prompt content:", prompt)

      const hfResponse = await axios.post(
        "https://api-inference.huggingface.co/models/google/flan-t5-large",
        {
          inputs: prompt,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 20000,
        }
      )

      // Log Hugging Face response structure
      request.log.info("Hugging Face API responded successfully.")
      request.log.debug("Response data:", hfResponse.data)

      if (hfResponse.data?.error) {
        throw new Error(hfResponse.data.error)
      }

      const enhancedText = hfResponse.data[0]?.generated_text || "No enhancement was generated."

      return reply.send({ enhancedDescription: enhancedText })
    } catch (error) {
      request.log.error("Enhancement error:", error)
      return reply.code(500).send({
        error: "Failed to enhance event description",
        message: error?.message || "Unknown error",
      })
    }
  })
}
