import { jsx as _jsx } from "react/jsx-runtime";
import './LogoutButton.css';
const LogoutButton = ({ onLogout }) => {
    return (_jsx("button", { className: "logout-button", onClick: onLogout, children: "\u30ED\u30B0\u30A2\u30A6\u30C8" }));
};
export default LogoutButton;
