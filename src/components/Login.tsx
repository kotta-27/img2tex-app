import React, { useState } from "react";
import "../styles/login-style.css";

interface LoginProps {
  onSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    // For now, hardcoded credentials
    if (userId === "watabe" && password === "quantum") {
      setIsAuthenticated(true);
      onSuccess();
    } else {
      alert("認証に失敗しました");
    }
  };

  return (
    <div className="login-container">
      <h2>ログイン</h2>
      <div className="login-input-container">
        <div className="login-id-container">
          <label>ユーザーID:</label>
          <input
            className="login-id-input"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>
        <div className="logion-pass-container">
          <label>パスワード:</label>
          <input
            className="login-pass-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      <button className="login-button" onClick={handleLogin}>ログイン</button>
    </div>
  );
};

export default Login;
