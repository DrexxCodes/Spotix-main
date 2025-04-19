// Convert to Fastify plugin
import https from "https"

// Fastify plugin
export default async function paymentRoute(fastify, options) {
  // Paystack Secret Key
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

  // Initialize payment
  fastify.post("/payment", async (request, reply) => {
    const { amount, email, metadata } = request.body

    if (!amount || !email) {
      return reply.code(400).send({ error: "Amount and email are required" })
    }

    // Initialize transaction with Paystack
    const params = JSON.stringify({
      email,
      amount: Math.round(amount * 100), // Paystack expects amount in kobo (smallest currency unit)
      metadata,
      callback_url: `${process.env.APP_URL}/paystack-success`,
    })

    try {
      const response = await new Promise((resolve, reject) => {
        const options = {
          hostname: "api.paystack.co",
          port: 443,
          path: "/transaction/initialize",
          method: "POST",
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
            "Content-Length": params.length,
          },
        }

        const paystackReq = https.request(options, (paystackRes) => {
          let data = ""

          paystackRes.on("data", (chunk) => {
            data += chunk
          })

          paystackRes.on("end", () => {
            resolve(JSON.parse(data))
          })
        })

        paystackReq.on("error", (error) => {
          reject(error)
        })

        paystackReq.write(params)
        paystackReq.end()
      })

      return response
    } catch (error) {
      fastify.log.error("Payment initialization error:", error)
      return reply.code(500).send({ error: "Failed to initialize payment" })
    }
  })

  // Verify payment
  fastify.get("/payment/verify", async (request, reply) => {
    const { reference } = request.query

    if (!reference) {
      return reply.code(400).send({ error: "Reference is required" })
    }

    try {
      const response = await new Promise((resolve, reject) => {
        const options = {
          hostname: "api.paystack.co",
          port: 443,
          path: `/transaction/verify/${reference}`,
          method: "GET",
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }

        const paystackReq = https.request(options, (paystackRes) => {
          let data = ""

          paystackRes.on("data", (chunk) => {
            data += chunk
          })

          paystackRes.on("end", () => {
            resolve(JSON.parse(data))
          })
        })

        paystackReq.on("error", (error) => {
          reject(error)
        })

        paystackReq.end()
      })

      return response
    } catch (error) {
      fastify.log.error("Payment verification error:", error)
      return reply.code(500).send({ error: "Failed to verify payment" })
    }
  })
}
