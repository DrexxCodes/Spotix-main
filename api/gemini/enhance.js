// Convert to Fastify plugin
import { GoogleGenerativeAI } from "@google/generative-ai"

// Fastify plugin
export default async function enhanceRoute(fastify, options) {
  // Initialize the Google Generative AI with your API key
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

  // Register the route at /enhance to match what the frontend expects
  fastify.post("/enhance", async (request, reply) => {
    try {
      const { eventName, eventDescription, eventDate, eventVenue, eventType } = request.body

      // Validate required fields
      if (!eventName || !eventDescription || !eventDate || !eventVenue || !eventType) {
        return reply.code(400).send({ error: "Missing required event details" })
      }

      // Get the generative model
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

      // Create a prompt for Gemini
      const prompt = `
      You are an expert event copywriter. Create a captivating and professional event description for the following event:
      
      Event Name: ${eventName}
      Event Type: ${eventType}
      Event Date: ${eventDate}
      Event Venue: ${eventVenue}
      
      Original Description: "${eventDescription}"
      
      Please enhance this description to make it more engaging, professional, and appealing to potential attendees.
      The enhanced description should:
      1. Be approximately 150-250 words
      2. Highlight the unique aspects of the event
      3. Create excitement and urgency
      4. Include relevant details about what attendees can expect
      5. Use professional but engaging language
      6. Maintain the core information from the original description
      
      Return only the enhanced description text without any additional commentary or formatting.
      `

      // Generate content
      const result = await model.generateContent(prompt)
      const response = await result.response
      const enhancedDescription = response.text().trim()

      // Return the enhanced description
      return { enhancedDescription }
    } catch (error) {
      fastify.log.error("Error enhancing event description:", error)
      return reply.code(500).send({
        error: "Failed to enhance description",
        message: error.message,
      })
    }
  })
}
