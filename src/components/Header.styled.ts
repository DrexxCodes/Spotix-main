import styled from "styled-components"
import { X } from "lucide-react"

// Header Container
export const HeaderContainer = styled.header`
  position: fixed; /* Makes it stick to the top */
  top: 0;
  left: 0;
  width: 100%;
  background-color: white; /* Adjust based on theme */
  z-index: 1000; /* Ensures it stays on top */
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
`

// Logo and Title Section
export const LogoSection = styled.div`
  display: flex;
  align-items: center;
`

export const Logo = styled.img`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
`

export const Title = styled.h2`
  font-size: 18px;
  margin-left: 10px;
  font-weight: bold;
  color: #333;
  
  a {
    text-decoration: none;
    color: inherit;
  }
`

// Menu Icon - Only visible on mobile
export const MenuIcon = styled.div`
  cursor: pointer;
  display: flex;
  align-items: center;
  
  @media (min-width: 768px) {
    display: none; /* Hide on desktop */
  }
`

export const CloseIcon = styled(X)`
  position: absolute;
  top: 15px;  /* Adjust spacing */
  right: 15px; /* Keep it inside */
  cursor: pointer;
  font-size: 24px;
  color: black; /* Adjust for visibility */
  transition: transform 0.3s ease;

  &:hover {
    transform: rotate(90deg); /* Adds a hover effect */
  }
`

// Navigation Overlay for Blur Effect
export const NavOverlay = styled.div<{ menuOpen: boolean }>`
  display: ${({ menuOpen }) => (menuOpen ? "block" : "none")};
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  z-index: 10;
  
  @media (min-width: 768px) {
    display: none; /* Always hide on desktop */
  }
`

// Sidebar Navigation - Mobile only
export const Nav = styled.nav<{ menuOpen: boolean }>`
  position: fixed;
  top: 0;
  right: ${({ menuOpen }) => (menuOpen ? "0" : "-250px")};
  width: 250px;
  height: 100vh;
  background: #fff;
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.2);
  padding: 20px;
  transition: right 0.3s ease-in-out;
  z-index: 999999999;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  
  @media (min-width: 768px) {
    display: none; /* Hide on desktop */
  }
`

// Navigation List
export const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`

export const NavItem = styled.li`
  display: flex;
  align-items: center;
  padding: 12px;
  font-size: 16px;
  color: #333;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f4f4f4;
    color: #6b2fa5;
    transform: translateY(-2px);
  }

  svg {
    margin-right: 10px;
  }

  a {
    text-decoration: none;
    color: inherit;
  }
`

// Footer Links
export const Footer = styled.div`
  text-align: center;
  padding: 15px 0;
`

export const FooterLink = styled.p`
  font-size: 14px;
  color: #555;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #000;
  }
  
  a {
    text-decoration: none;
    color: inherit;
  }
`

// Desktop Navigation - Only visible on desktop
export const DesktopNav = styled.nav`
  display: none; /* Hidden by default (mobile) */
  
  @media (min-width: 768px) {
    display: flex;
    align-items: center;
  }
`

export const DesktopNavList = styled.ul`
  display: flex;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 20px;
`

export const DesktopNavItem = styled.li`
  display: flex;
  align-items: center;
  font-size: 16px;
  color: #333;
  cursor: pointer;
  position: relative;
  
  &:after {
    content: '';
    position: absolute;
    width: 0;
    height: 2px;
    bottom: -5px;
    left: 0;
    background-color: #6b2fa5;
    transition: width 0.3s ease;
  }
  
  &:hover {
    color: #6b2fa5;
    
    &:after {
      width: 100%;
    }
  }
  
  svg {
    margin-right: 8px;
  }
  
  a {
    text-decoration: none;
    color: inherit;
    display: flex;
    align-items: center;
  }
`
