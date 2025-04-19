import styled from "styled-components";

const LandingFooter = () => {
  return (
    <FooterSection>
      <p>&copy; {new Date().getFullYear()} Spotix. All rights reserved.</p>
    </FooterSection>
  );
};

const FooterSection = styled.footer`
  text-align: center;
  padding: 20px;
  background: #333;
  color: white;
`;

export default LandingFooter;
