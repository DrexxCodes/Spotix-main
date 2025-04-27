import styled from "styled-components"
import { X } from "lucide-react"

// Header Container (Fixed Top)
export const HeaderContainer = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background-color: white;
  z-index: 1000;
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
`

// Hamburger Icon (small screens only)
export const MenuIcon = styled.div`
  cursor: pointer;
  display: flex;
  align-items: center;

  @media (min-width: 768px) {
    display: none;
  }
`

// Close Icon (X) hidden on large screens
export const CloseIcon = styled(X)`
  position: absolute;
  top: 15px;
  right: 15px;
  cursor: pointer;
  font-size: 24px;
  color: black;
  transition: transform 0.3s ease;

  &:hover {
    transform: rotate(90deg);
  }

  @media (min-width: 768px) {
    display: none; /* Hide Close Icon on Desktop */
  }
`

// Navigation Overlay (for mobile)
export const NavOverlay = styled.div<{ menuOpen: boolean }>`
  display: ${({ menuOpen }) => (menuOpen ? "block" : "none")};
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  z-index: 999;
`

// Nav itself (side drawer on mobile, inline on desktop)
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
  z-index: 9999;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  @media (min-width: 768px) {
    position: static;
    width: auto;
    height: auto;
    flex-direction: row;
    box-shadow: none;
    background: transparent;
    padding: 0;
    justify-content: flex-end;
    align-items: center;
    transition: none;
  }
`

// Nav List
export const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;

  @media (min-width: 768px) {
    display: flex;
    gap: 30px;
    align-items: center;
  }
`

// Nav Item
export const NavItem = styled.li`
  display: flex;
  align-items: center;
  padding: 12px;
  font-size: 16px;
  color: #333;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    color: #6b2fa5;
    transform: translateY(-2px);
  }

  &:after {
    content: "";
    position: absolute;
    bottom: 5px;
    left: 0;
    width: 0%;
    height: 2px;
    background-color: #6b2fa5;
    transition: width 0.4s ease;
  }

  &:hover:after {
    width: 100%;
  }

  svg {
    margin-right: 10px;
  }

  a {
    text-decoration: none;
    color: inherit;
  }
`

// Footer Links (only mobile)
export const Footer = styled.div`
  text-align: center;
  padding: 15px 0;

  @media (min-width: 768px) {
    display: none;
  }
`

export const FooterLink = styled.p`
  font-size: 14px;
  color: #555;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #6b2fa5;
  }
`