import { useState, useEffect } from "react";
import { auth, db } from "../services/firebase";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Preloader from "../components/preloader";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [referral, setReferral] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true); // Page load preloader
  const [signingUp, setSigningUp] = useState(false); // Signup action preloader
  const navigate = useNavigate();

  // Words for animation
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSigningUp(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: username });

      // Store user info in Firestore
      await setDoc(doc(db, "users", user.uid), {
        fullName,
        username,
        email,
        referral,
        isBooker: false, 
        wallet: 0.00,
      });

      // Send email verification
      await sendEmailVerification(user);

      setError("A confirmation email has been sent. Please verify your email before logging in.");
    } catch (err: any) {
      setError("Failed to create an account.");
    }

    setSigningUp(false);
  };

  return (
    <>
      <Preloader loading={loading || signingUp} />
      <div className="auth-container">
        <div className="auth-form">
          <img src="/logo.svg" alt="Logo" className="auth-logo" />
          <h2>Sign Up</h2>
          {error && <p className="error-message">{error}</p>}

          <form onSubmit={handleSignup}>
            <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />

            <div className="password-container">
              <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              {showPassword ? <EyeOff className="password-toggle" onClick={() => setShowPassword(false)} /> : <Eye className="password-toggle" onClick={() => setShowPassword(true)} />}
            </div>

            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            <input type="text" placeholder="Referral Code (Optional)" value={referral} onChange={(e) => setReferral(e.target.value)} />

            <button type="submit">Sign Up</button>
            <p>Already a Spotix User? <a href="/login">Log in</a></p>
          </form>
        </div>

        <div className="auth-text">
          <img src="/logo.svg" alt="Logo" className="auth-logo" />
          Use Spotix to Book That <span id="animated-text">Event</span>
        </div>
      </div>
    </>
  );
};

export default Signup;
