import styled from "styled-components";
import { motion } from "framer-motion";
import { FaWallet, FaUsers, FaShieldAlt } from "react-icons/fa";

const Features = () => {
  return (
    <Section id="features">
      <h2>Why Choose Spotix?</h2>
      <hr></hr>
      <div className="features">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            className="feature"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
          >
            <div className="icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
};

const features = [
  { icon: <FaWallet />, title: "Secure Payments", description: "Fast and reliable transactions." },
  { icon: <FaUsers />, title: "Community Driven", description: "Connect with like-minded event-goers." },
  { icon: <FaShieldAlt />, title: "Safe & Verified", description: "All events are verified for authenticity." },
];

const Section = styled.section`
  text-align: center;
  padding: 80px 20px;
  background: #fff;

  h2 {
    font-size: 1.3rem;
    margin-bottom: 20px;
    color: #6b2fa5
  }

  .features {
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
  }

  .feature {
    max-width: 300px;
    padding: 20px;
    background: #f9f9f9;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    text-align: center;
    margin: 10px;
  }

  .icon {
    font-size: 2.5rem;
    color: #6200ea;
    margin-bottom: 10px;
  }

  h3 {
    margin-bottom: 10px;
    font-size: 1.2rem;
  }
`;

export default Features;
