import { useState, useEffect } from "react";
import { auth } from "../services/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import Preloader from "../components/preloader";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true); // App preloader
  const [resetting, setResetting] = useState(false); // Reset action preloader

  useEffect(() => {
    // Hide preloader after initial page load
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setResetting(true); // Show preloader when resetting password

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent! Check your inbox.");
    } catch (err: any) {
      setError("Failed to send reset email. Please try again.");
    }

    setResetting(false); // Hide preloader after action
  };

  return (
    <>
      <Preloader loading={loading || resetting} /> {/* Show preloader if loading or resetting password */}

      <div className="auth-container">
        {/* Left Side - Forgot Password Form */}
        <div className="auth-form">
          <img src="/logo.svg" alt="Logo" className="auth-logo" />
          <h2>Forgot Password</h2>
          {message && <p className="success-message">{message}</p>}
          {error && <p className="error-message">{error}</p>}

          <form onSubmit={handleReset}>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit">Send Reset Link</button>
          </form>

          <p><a href="/login">Back to Login</a></p>
        </div>

        {/* Right Side - Forgot Password Image */}
        <div className="auth-text">
          <img src="/logo.svg" alt="Logo" className="auth-logo" />
          <img src="/forgotP.svg" alt="Forgot Password" className="forgot-image" />
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
