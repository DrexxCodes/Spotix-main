"use client"

import type React from "react"
import { useState } from "react"
import { Menu, X, CalendarPlus, User, List, HomeIcon as House, BrickWall } from "lucide-react"
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

const BookersHeader: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev)
  }

  return (
    <>
      <HeaderContainer>
        <LogoSection>
          <Link to="/bookerDashboard">
            <Logo src="/logo.svg" alt="Spotix Logo" />
          </Link>
          <Title>Spotix for Bookers</Title>
        </LogoSection>

        {/* Desktop Navigation */}
        <DesktopNav>
          <DesktopNavList>
            <DesktopNavItem>
              <a href="/bookerDashboard">
                <House size={18} />
                Home
              </a>
            </DesktopNavItem>
            <DesktopNavItem>
              <a href="/createevent">
                <CalendarPlus size={18} />
                Create Event
              </a>
            </DesktopNavItem>
            <DesktopNavItem>
              <a href="/bookerprofile">
                <User size={18} />
                My Profile
              </a>
            </DesktopNavItem>
            <DesktopNavItem>
              <a href="/bookertickets">
                <List size={18} />
                My Events
              </a>
            </DesktopNavItem>
            <DesktopNavItem>
              <a href="/home">
                <BrickWall size={18} />
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
            <a href="/bookerDashboard">Home</a>
          </NavItem>
          <NavItem onClick={() => setMenuOpen(false)}>
            <CalendarPlus size={20} />
            <a href="/createevent">Create Event</a>
          </NavItem>
          <NavItem onClick={() => setMenuOpen(false)}>
            <User size={20} />
            <a href="/bookerprofile">My Profile</a>
          </NavItem>
          <NavItem onClick={() => setMenuOpen(false)}>
            <List size={20} />
            <a href="/bookertickets">My Events</a>
          </NavItem>
          <NavItem onClick={() => setMenuOpen(false)}>
            <BrickWall size={20} />
            <a href="/home">Event Home</a>
          </NavItem>
        </NavList>

        <Footer>
          <FooterLink>
            <a href="https://me.spotix.xyz/terms">Terms and Conditions</a>
          </FooterLink>
          <FooterLink>
            <a href="https://tawk.to/chat/67f231fc2dd176190b3b2db3/1io7jc0ap">Contact Us</a>
          </FooterLink>
        </Footer>
      </Nav>
    </>
  )
}

export default BookersHeader
