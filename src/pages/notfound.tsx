"use client"
import UserHeader from "../components/UserHeader"
import Footer from "../components/footer"
import { useNavigate } from "react-router-dom"
// import "../styles/404.css"

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <>
      <UserHeader />
      <div className="not-found-container">
        <img src="/404.svg" alt="404 Not Found" className="not-found-image" />
        <h1>Page Not Found</h1>
        <p>The resource you're looking for is either not available on this particular server, the resource is still being developed or you might have followed a broken URL. Either way, the page is not here.</p>
        <button className="home-button" onClick={() => navigate("/")}>
          Go Home
        </button>
      </div>
      <Footer />
    </>
  )
}

export default NotFound

