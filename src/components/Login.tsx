import React, { useState } from "react";
import "../styles/login-style.css";

interface LoginProps {
  onSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isButtonPushed, setIsButtonPushed] = useState(false);
  const [message, setMessage] = useState("");

  const myId = import.meta.env.VITE_ID;
  const myPassword = import.meta.env.VITE_PASS;

  const handleLogin = () => {
    // For now, hardcoded credentials
    if (isButtonPushed == false) {
      setIsButtonPushed(true);
    }
    if (userId === myId && password === myPassword) {
      setIsAuthenticated(true);
      setMessage("ログイン成功");
      localStorage.setItem("isLoggedIn", "true"); // Add this line
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } else {
      setIsAuthenticated(false);
      setMessage("ユーザーIDまたはパスワードが違います");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <h3>ログイン</h3>
        <div className="login-input-container">
          <div className="login-id-container">
            <div className="login-id-label">user ID:</div>
            <input
              className="login-id-input"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
          <div className="login-pass-container">
            <label className="login-id-label">Password:</label>
            <input
              className="login-pass-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        <div
          className={`message ${
            isAuthenticated ? "success-message" : "error-message"
          }`}
        >
          {isButtonPushed ? (
            isAuthenticated ? (
              <div>
                <i
                  className="fa-solid fa-circle-check"
                  style={{ color: "#63E6BE" }}
                ></i>
                {"  " +message}
              </div>
            ) : (
              <div>
                <i
                  className="fa-solid fa-circle-exclamation"
                  style={{ color: "#FFA07A" }}
                ></i>
                {"  " + message}
              </div>
            )
          ) : (
            ""
          )}
          {/* {message} */}
        </div>
        <button className="login-button" onClick={handleLogin}>
          ログイン
        </button>
      </div>
    </div>
  );
};

export default Login;
