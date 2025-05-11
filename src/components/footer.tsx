"use client"

import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import "boxicons/css/boxicons.min.css"

const Footer = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  useEffect(() => {
    setCurrentYear(new Date().getFullYear())
  }, [])

  return (
    <footer className="footer-container">
      <div className="footer-content">
        <div className="footer-column about-column">
          <div className="logo-container">
            <a href="/"><img src="/logo.svg" alt="Spotix Logo" className="footer-logo" /></a>
            <h2 className="footer-brand"><a href="/">SPOTIX</a></h2>
          </div>
          <p className="about-text">
            Spotix is your premier platform for discovering and booking tickets to the most exciting events. From
            conferences to night parties, we've got you covered with a seamless booking experience.
          </p>
        </div>

        <div className="footer-column links-column">
          <h3 className="column-title">Quick Links</h3>
          <ul className="footer-links">
            <li>
              <Link to="/home">Events</Link>
            </li>
            <li>
              <Link to="/my-tickets">My Tickets</Link>
            </li>
            <li>
              <Link to="/loginbooker">Booker Login</Link>
            </li>
            <li>
              <Link to="https://t.me/SpotixNG_bot">Spotix Bot</Link>
            </li>
          </ul>
        </div>

        <div className="footer-column help-column">
          <h3 className="column-title">Quick Links & Legal</h3>
          <ul className="footer-links">
            <li>
              <Link to="https://my.spotix.com.ng/privacy">Privacy Policy</Link>
            </li>
            <li>
              <Link to="https://my.spotix.com.ng/terms">User Terms</Link>
            </li>
            <li>
              <Link to="https://anonymous.spotix.com.ng">Spotix Anonymous</Link>
            </li>
            <li>
              <Link to="https://spotix.tawk.help">Help Center</Link>
            </li>
            <li>
              <Link to="https://blog.spotix.com.ng/terms">Blog</Link>
            </li>
            <li>
              <Link to="https://tawk.to/chat/67f231fc2dd176190b3b2db3/1io7jc0ap">Contact Us</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="social-icons">
        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
          <i className="bx bxl-facebook-circle bx-tada" ></i>
        </a>
        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
          <i className="bx bxl-instagram bx-tada"></i>
        </a>
        <a href="https://whatsapp.com" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
          <i className="bx bxl-whatsapp bx-tada"></i>
        </a>
        <a href="https://snapchat.com" target="_blank" rel="noopener noreferrer" aria-label="Snapchat">
          <i className="bx bxl-snapchat bx-tada"></i>
        </a>
      </div>

      <hr className="footer-divider" />

      <div className="copyright">© {currentYear} Spotix PLC. All rights reserved.</div>
    </footer>
  )
}

export default Footer

