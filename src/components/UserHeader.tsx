"use client";

import React, { useState } from "react";
import { CloseIcon } from "./Header.styled"; 
import { Menu, X, CalendarPlus, User, Bot, CreditCard, AppWindow } from "lucide-react"; 
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
    FooterLink
  } from "./Header.styled";
  import { useNavigate } from "react-router-dom"
  

const UserHeader: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  return (
    <>
      <HeaderContainer>
        <LogoSection>
          <a href="/">
            <Logo src="/logo.svg" alt="Spotix Logo" />
          </a>
          <Title><a href="/">Spotix</a></Title>
        </LogoSection>
        <MenuIcon onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={28} /> : <Menu size={28} />}
        </MenuIcon>
      </HeaderContainer>

      <NavOverlay menuOpen={menuOpen} onClick={() => setMenuOpen(false)} />

      <Nav menuOpen={menuOpen}>
        <NavList>
      <CloseIcon onClick={toggleMenu} /> 

          <NavItem onClick={() => setMenuOpen(false)}>
            <CalendarPlus onClick={() => navigate("/home")} size={20} />
            <a href="/home">Home</a>
          </NavItem>

          <NavItem onClick={() => setMenuOpen(false)}>
            <User onClick={() => navigate("/profile")}  size={20} />
            <a href="/Profile">My Profile</a>
          </NavItem>


          <NavItem onClick={() => setMenuOpen(false)}>
            <CreditCard onClick={() => navigate("/ticket-history")}  size={20} />
            <a href="/ticket-history">My Tickets</a>
          </NavItem>
          

          <NavItem onClick={() => setMenuOpen(false)}>
            <AppWindow onClick={() => navigate("/bookerdashboard")}  size={20} />
            <a href="/bookerdashboard">Dashboard</a>
          </NavItem>
          
          <NavItem onClick={() => setMenuOpen(false)}>
            <Bot size={20} />
            <a href="https://t.me/SpotixNG_bot">Telegram Bot</a>
          </NavItem>
        </NavList>

        <Footer>
          <FooterLink><a href="https://me.spotix.xyz/terms">Terms and Conditions</a></FooterLink>
          <FooterLink>Contact Us</FooterLink>
        </Footer>
      </Nav>
    </>
  );
};

export default UserHeader;
