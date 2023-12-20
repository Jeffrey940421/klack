import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Redirect } from "react-router-dom";
import * as sessionActions from "../../store/session";
import './SignupForm.css';

function SignupFormPage() {
  const dispatch = useDispatch();
  const sessionUser = useSelector((state) => state.session.user);
  const [email, setEmail] = useState("");
  const [onchangeEmail, setOnchangeEmail] = useState("");
  const [emailEdited, setEmailEdited] = useState(false);
  const [password, setPassword] = useState("");
  const [onchangePassword, setOnchangePassword] = useState("");
  const [passwordEdited, setPasswordEdited] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [onchangeConfirmPassword, setOnchangeConfirmPassword] = useState("");
  const [confirmPasswordEdited, setConfirmPasswordEdited] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverErrors, setServerErrors] = useState({ email: [], password: [], other: [] });
  const [validationErrors, setValidationErrors] = useState({ email: [], password: [], confirmPassword: [] });

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!Object.values(validationErrors).flat().length) {
      const data = await dispatch(sessionActions.signUp(email.toLowerCase(), password));
      const errors = { email: [], password: [], other: [] }
      if (data) {
        const emailErrors = data.filter(error => error.startsWith("email"))
        const passwordErrors = data.filter(error => error.startsWith("password"))
        const otherErrors = data.filter(error => !error.startsWith("password") && !error.startsWith("email"))
        errors.email = emailErrors.map(error => error.split(" : ")[1])
        errors.password = passwordErrors.map(error => error.split(" : ")[1])
        errors.other = otherErrors
        setServerErrors(errors)
      } else {
        return <Redirect to="/" />
      }
    }
  };

  useEffect(() => {
    const errors = { email: [], password: [], confirmPassword: [] };
    if (emailEdited && !email) {
      errors.email.push("Email is required");
    }
    if (email && !validateEmail(email)) {
      errors.email.push("Email is invalid");
    };
    if (passwordEdited && !password) {
      errors.password.push("Password is required");
    }
    if (password && password.length < 6) {
      errors.password.push("Password must be at least 6 characters long");
    };
    if (password && password.length > 16) {
      errors.password.push("Password must be at most 16 characters long");
    };
    if (confirmPasswordEdited && !confirmPassword) {
      errors.confirmPassword.push("Confirm password is required")
    }
    if (confirmPassword && confirmPassword.length < 6) {
      errors.confirmPassword.push("Confirm password must be at least 6 characters long");
    };
    if (confirmPassword && confirmPassword.length > 16) {
      errors.confirmPassword.push("Confirm password must be at most 16 characters long");
    };
    if (confirmPassword && password && confirmPassword !== password) {
      errors.confirmPassword.push("Confirm password must match password");
    };
    setValidationErrors(errors)
  }, [email, emailEdited, password, passwordEdited, confirmPassword, confirmPasswordEdited]);

  if (sessionUser) return <Redirect to="/" />;

  return (
    <div id="signup-form_container">
      <header id="signup-form_header">
        <div></div>
        <img id="signup-form_logo" className="logo" src="/klack_logo.svg" alt="logo" />
        <div></div>
      </header>
      <div id="signup_form-body">
        <h1>Sign up for Klack</h1>
        <p>We suggest using the <b>email address you use at work.</b></p>
        {
          serverErrors.other.length > 0 && serverErrors.other.map(error => (
            <span id="signup_form-other_server_errors" className="validation_errors">
              <i className="fa-solid fa-circle-exclamation" />
              {error}
            </span>
          ))
        }
        <form id="signup_form-form">
          <div id="signup_form-email_input" className={`input ${Object.values(validationErrors.email).length || Object.values(serverErrors.email).length ? "error" : ""}`}>
            <label htmlFor="email">Email</label>
            <input
              name="email"
              type="text"
              placeholder="name@work-email.com"
              value={onchangeEmail}
              onChange={(e) => setOnchangeEmail(e.target.value)}
              onBlur={(e) => {
                setEmail(e.target.value)
                setEmailEdited(true)
              }}
            />
            {
              validationErrors.email.length > 0 && validationErrors.email.map(error => (
                <span id="signup_form-email_validation_errors" className="validation_errors">
                  <i className="fa-solid fa-circle-exclamation" />
                  {error}
                </span>
              ))
            }
            {
              serverErrors.email.length > 0 && serverErrors.email.map(error => (
                <span id="signup_form-email_server_errors" className="validation_errors">
                  <i className="fa-solid fa-circle-exclamation" />
                  {error}
                </span>
              ))
            }
          </div>

          <div id="signup_form-password_input" className={`input ${Object.values(validationErrors.password).length || Object.values(serverErrors.password).length ? "error" : ""}`}>
            <label htmlFor="password">Password</label>
            <input
              name="pass"
              type={showPassword ? "text" : "password"}
              placeholder="●●●●●●"
              value={onchangePassword}
              onChange={(e) => setOnchangePassword(e.target.value)}
              onBlur={(e) => {
                setPassword(e.target.value)
                setPasswordEdited(true)
              }}
            />
            <button
              onClick={(e) => {
                e.preventDefault();
                setShowPassword((prev) => !prev);
              }}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
            {
              validationErrors.password.length > 0 && validationErrors.password.map(error => (
                <span id="signup_form-password_validation_errors" className="validation_errors">
                  <i className="fa-solid fa-circle-exclamation" />
                  {error}
                </span>
              ))
            }
            {
              serverErrors.password.length > 0 && serverErrors.password.map(error => (
                <span id="signup_form-password_server_errors" className="validation_errors">
                  <i className="fa-solid fa-circle-exclamation" />
                  {error}
                </span>
              ))
            }
          </div>

          <div id="signup_form-confirm_password_input" className={`input ${Object.values(validationErrors.password).length || Object.values(serverErrors.password).length ? "error" : ""}`}>
            <label htmlFor="confirm_password">Confirm Password</label>
            <input
              name="confirm_password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="●●●●●●"
              value={onchangeConfirmPassword}
              onChange={(e) => setOnchangeConfirmPassword(e.target.value)}
              onBlur={(e) => {
                setConfirmPassword(e.target.value)
                setConfirmPasswordEdited(true)
              }}
            />
            <button
              onClick={(e) => {
                e.preventDefault();
                setShowConfirmPassword((prev) => !prev);
              }}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
            {
              validationErrors.confirmPassword.length > 0 && validationErrors.confirmPassword.map(error => (
                <span id="signup_form-confirm_password_validation_errors" className="validation_errors">
                  <i className="fa-solid fa-circle-exclamation" />
                  {error}
                </span>
              ))
            }
          </div>

          <button
            id="signup_form-submit_button"
            disabled={Object.values(validationErrors).flat().length || !emailEdited || !passwordEdited || !confirmPasswordEdited}
            onClick={handleSubmit}
          >
            Sign Up
          </button>
          <div id="signup-form_login">
            <span>Already using Klack?</span>
            <br></br>
            <a href="/login">Log in to an existing account</a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SignupFormPage;
