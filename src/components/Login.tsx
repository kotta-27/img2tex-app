import React, { useState } from "react";
import "../styles/login-style.css";

interface LoginProps {
  onSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const myId = import.meta.env.VITE_ID;
  const myPassword = import.meta.env.VITE_PASS;

  const handleLogin = () => {
    // For now, hardcoded credentials
    if (userId === myId && password === myPassword) {
      setIsAuthenticated(true);
      onSuccess();
    } else {
      alert("認証に失敗しました");
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
        <button className="login-button" onClick={handleLogin}>
          ログイン
        </button>
      </div>
    </div>
  );
};

export default Login;
