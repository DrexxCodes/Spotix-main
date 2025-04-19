import React from "react"
import styled from "styled-components"

interface LogoutBtnProps {
  onClick: () => void
}

const LogoutBtn: React.FC<LogoutBtnProps> = ({ onClick }) => {
  return (
    <StyledWrapper>
      <button className="btn" onClick={onClick}>
        <span className="btn-text-one">LOGOUT</span>
        <span className="btn-text-two">BYE-BYE👍</span>
      </button>
    </StyledWrapper>
  )
}

const StyledWrapper = styled.div`
  .btn {
    width: 140px;
    height: 50px;
    background: linear-gradient(to top, #00154c, #12376e, #23487f);
    color: #fff;
    border-radius: 50px;
    border: none;
    outline: none;
    cursor: pointer;
    position: relative;
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  .btn span {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    transition: top 0.5s;
  }

  .btn-text-one {
    position: absolute;
    width: 100%;
    top: 50%;
    left: 0;
    transform: translateY(-50%);
  }

  .btn-text-two {
    position: absolute;
    width: 100%;
    top: 150%;
    left: 0;
    transform: translateY(-50%);
  }

  .btn:hover .btn-text-one {
    top: -100%;
  }

  .btn:hover .btn-text-two {
    top: 50%;
  }
`

export default LogoutBtn
