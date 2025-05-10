"use client"

import type React from "react"
import { useState } from "react"
import { Menu, X, CalendarPlus, User, Bot, CreditCard, AppWindow } from "lucide-react"
import {
  HeaderContainer,
  LogoSection,
  Logo,
  Title,
  MenuIcon,
  NavOverlay,
  Nav,
  NavList,
  NavItem,
  Footer,
  FooterLink,
  CloseIcon,
  DesktopNav,
  DesktopNavList,
  DesktopNavItem,
} from "./Header.styled"
import { useNavigate } from "react-router-dom"

const UserHeader: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev)
  }

  return (
    <>
      <HeaderContainer>
        <LogoSection>
          <a href="/">
            <Logo src="/logo.svg" alt="Spotix Logo" />
          </a>
          <Title>
            <a href="/">Spotix</a>
          </Title>
        </LogoSection>

        {/* Desktop Navigation */}
        <DesktopNav>
          <DesktopNavList>
            <DesktopNavItem>
              <a href="/home">
                Home
              </a>
            </DesktopNavItem>
            <DesktopNavItem>
              <a href="/Profile">
                My Profile
              </a>
            </DesktopNavItem>
            <DesktopNavItem>
              <a href="/ticket-history">
                My Tickets
              </a>
            </DesktopNavItem>
            <DesktopNavItem>
              <a href="/bookerdashboard">
                Dashboard
              </a>
            </DesktopNavItem>
            <DesktopNavItem>
              <a href="https://t.me/SpotixNG_bot">
                Telegram Bot
              </a>
            </DesktopNavItem>
          </DesktopNavList>
        </DesktopNav>

        {/* Mobile Menu Icon */}
        <MenuIcon onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={28} /> : <Menu size={28} />}</MenuIcon>
      </HeaderContainer>

      {/* Mobile Navigation */}
      <NavOverlay menuOpen={menuOpen} onClick={() => setMenuOpen(false)} />
      <Nav menuOpen={menuOpen}>
        <NavList>
          <CloseIcon onClick={toggleMenu} />
          <NavItem onClick={() => setMenuOpen(false)}>
            <CalendarPlus size={20} />
            <a href="/home">Home</a>
          </NavItem>
          <NavItem onClick={() => setMenuOpen(false)}>
            <User size={20} />
            <a href="/Profile">My Profile</a>
          </NavItem>
          <NavItem onClick={() => setMenuOpen(false)}>
            <CreditCard size={20} />
            <a href="/ticket-history">My Tickets</a>
          </NavItem>
          <NavItem onClick={() => setMenuOpen(false)}>
            <AppWindow size={20} />
            <a href="/bookerdashboard">Dashboard</a>
          </NavItem>
          <NavItem onClick={() => setMenuOpen(false)}>
            <Bot size={20} />
            <a href="https://t.me/SpotixNG_bot">Telegram Bot</a>
          </NavItem>
        </NavList>

               <Footer>
          <FooterLink>
            <a href="https://my.spotix.com.ng/privacy">Spotix Privacy Policy</a>
          </FooterLink>
          <FooterLink>
            <a href="https://my.spotix.com.ng/acceptable-usage">Terms and Conditions</a>
          </FooterLink>
          <FooterLink>
            <a href="https://tawk.to/chat/67f231fc2dd176190b3b2db3/1io7jc0ap">Contact Us</a>
          </FooterLink>
        </Footer>
      </Nav>
    </>
  )
}

export default UserHeader
