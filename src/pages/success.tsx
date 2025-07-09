import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// import "../components/payment-override.css"


const Success = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { eventId: string; payId: string } | null;

  useEffect(() => {
    // If no state was passed, redirect to home
    if (!state) {
      navigate("/home");
    }
  }, [state, navigate]);

  // Handle the button click to go to home
  const goToHome = () => {
    navigate("/home");
  };

  if (!state) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="success-container">
      <img src="/all-done.svg" alt="Success" className="success-image" />
      <h1>Congratulations!</h1>
      <p className="success-message">
        You have successfully created an event. Your event details are now live and ready for attendees to purchase tickets.
      </p>
      
      <div className="event-id-container">
        <div className="id-block">
          <h3>Event ID</h3>
          <p>{state.eventId}</p>
        </div>
        <div className="id-block">
          <h3>Pay ID</h3>
          <p>{state.payId}</p>
        </div>
      </div>
      
      <button className="home-button" onClick={goToHome}>
        Go to Home
      </button>
    </div>
  );
};

export default Success;