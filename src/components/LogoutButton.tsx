import React from 'react';
import './LogoutButton.css';

interface LogoutButtonProps {
  onLogout: () => void;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ onLogout }) => {
  return (
    <button className="logout-button" onClick={onLogout}>
      ログアウト
    </button>
  );
};

export default LogoutButton;
