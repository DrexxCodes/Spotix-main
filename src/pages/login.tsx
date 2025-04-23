import { useState, useEffect } from "react";
import { auth } from "../services/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Preloader from "../components/preloader";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const navigate = useNavigate();

  const words = ["Event", "Party", "Meeting", "Conference"];

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
    let index = 0;
    const interval = setInterval(() => {
      const animatedText = document.getElementById("animated-text");
      if (animatedText) {
        animatedText.style.opacity = "0";
        setTimeout(() => {
          animatedText.textContent = words[index];
          animatedText.style.opacity = "1";
          index = (index + 1) % words.length;
        }, 300);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoggingIn(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if email is verified
      if (!user.emailVerified) {
        setError("Please verify your email before logging in.");
        return;
      }

      navigate("/");
    } catch (err: any) {
      setError("Invalid email or password.");
    }

    setLoggingIn(false);
  };

  return (
    <>
    <div className="fix-login">  
          <Preloader loading={loading || loggingIn} />
      <div className="auth-container">
        <div className="auth-form">
          <img src="/logo.svg" alt="Logo" className="auth-logo" />
          <h2>Login</h2>
          {error && <p className="error-message">{error}</p>}

          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />

            <div className="password-container">
              <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              {showPassword ? <EyeOff className="password-toggle" onClick={() => setShowPassword(false)} /> : <Eye className="password-toggle" onClick={() => setShowPassword(true)} />}
            </div>

            <button type="submit">Login</button>
          </form>

          <p>Don't have an account? <a href="/signup">Sign up</a></p>
          <p><a href="/forgot-password">Forgot Password?</a></p>
        </div>

        <div className="auth-text">
          <img src="/logo.svg" alt="Logo" className="auth-logo" />
          Use Spotix to Book That <span id="animated-text">Event</span>
        </div>
      </div>
      </div>

    </>
  );
};

export default Login;
