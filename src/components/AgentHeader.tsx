"use client"

import type React from "react"
import { useState } from "react"
import { Menu, X, Key, User, List, HomeIcon as House, BrickWall } from "lucide-react"
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
import { Link } from "react-router-dom"

const AgentHeader: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev)
  }

  return (
    <>
      <HeaderContainer>
        <LogoSection>
          <Link to="/Agent">
            <Logo src="/logo.svg" alt="Spotix Logo" />
          </Link>
          <Title>Spotix for Agents</Title>
        </LogoSection>

        {/* Desktop Navigation */}
        <DesktopNav>
          <DesktopNavList>
            <DesktopNavItem>
              <a href="/Agent">
                Home
              </a>
            </DesktopNavItem>
            <DesktopNavItem>
              <a href="/agent-transactions">
                Transactions
              </a>
            </DesktopNavItem>
            <DesktopNavItem>
              <a href="/agent-v-auth">
                Agent Auth Generation
              </a>
            </DesktopNavItem>
            <DesktopNavItem>
              <a href="/home">
                Event Home
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
            <House size={20} />
            <a href="/Agent">Home</a>
          </NavItem>
          <NavItem onClick={() => setMenuOpen(false)}>
            <User size={20} />
            <a href="/agent-transactions">Transactions</a>
          </NavItem>
          <NavItem onClick={() => setMenuOpen(false)}>
            <Key size={20} />
            <a href="/agent-v-auth">Auth Key Generation</a>
          </NavItem>
          <NavItem onClick={() => setMenuOpen(false)}>
            <BrickWall size={20} />
            <a href="/home">Event Home</a>
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

export default AgentHeader
