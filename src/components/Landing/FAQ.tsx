"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown } from "lucide-react"

const FAQ = () => {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in")
          }
        })
      },
      { threshold: 0.2 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  const faqs = [
    {
      question: "How do I purchase tickets on Spotix?",
      answer:
        "Purchasing tickets on Spotix is easy! Simply browse events, select the one you're interested in, choose your ticket type, and proceed to checkout. We support multiple payment methods including credit cards and wallet balance for a seamless experience.",
    },
    {
      question: "Can I get a refund if I can't attend an event?",
      answer:
        "Refund policies vary by event. Some events allow full refunds up to a certain date, while others may only offer partial refunds or ticket transfers. Check the specific event's refund policy on its details page or contact the event organizer directly.",
    },
    {
      question: "How do I become a booker on Spotix?",
      answer:
        "To become a booker, create a regular account first, then navigate to the 'Become a Booker' section. You'll need to complete a verification process that includes providing your personal and banking information. Once verified, you can start creating and managing your own events.",
    },
    {
      question: "Are the tickets transferable?",
      answer:
        "Yes, most tickets on Spotix are transferable. You can transfer your ticket to someone else by sharing your unique ticket ID with them. Some events may have restrictions on transfers, so always check the event details.",
    },
    {
      question: "How secure is the payment process?",
      answer:
        "Spotix uses bank-level encryption and security measures to protect all transactions. We never store your full credit card details, and all payments are processed through secure payment gateways.",
    },
  ]

  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index)
  }

  return (
    <section className="faq-section" ref={sectionRef}>
      <div className="section-container">
        <h2 className="section-title">Frequently Asked Questions</h2>

        <div className="faq-container">
          {faqs.map((faq, index) => (
            <div key={index} className={`faq-item ${activeIndex === index ? "active" : ""}`}>
              <button className="faq-question" onClick={() => toggleFAQ(index)}>
                {faq.question}
                <ChevronDown size={20} className={`faq-icon ${activeIndex === index ? "rotate" : ""}`} />
              </button>
              <div className={`faq-answer ${activeIndex === index ? "show" : ""}`}>{faq.answer}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FAQ

