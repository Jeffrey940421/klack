import React, { useEffect, useState } from "react";
import { login, demo } from "../../store/session";
import { useDispatch, useSelector } from "react-redux";
import { Redirect } from "react-router-dom";
import './LoginForm.css';

function LoginFormPage() {
  const dispatch = useDispatch();
  const sessionUser = useSelector((state) => state.session.user);
  const [email, setEmail] = useState("");
  const [onchangeEmail, setOnchangeEmail] = useState("");
  const [emailEdited, setEmailEdited] = useState(false);
  const [password, setPassword] = useState("");
  const [onchangePassword, setOnchangePassword] = useState("");
  const [passwordEdited, setPasswordEdited] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverErrors, setServerErrors] = useState({ email: [], password: [], other: [] });
  const [validationErrors, setValidationErrors] = useState({ email: [], password: [] });

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
      const data = await dispatch(login(email.toLowerCase(), password));
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

  const handleDemo = async (e, id) => {
    e.preventDefault()
    const data = await dispatch(demo(id));
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

  useEffect(() => {
    const errors = { email: [], password: [] };

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

    setValidationErrors(errors)

  }, [email, emailEdited, password, passwordEdited]);

  if (sessionUser) return <Redirect to="/" />;

  return (
    <div id="login-form_container">
      <header id="login-form_header">
        <div></div>
        <img id="login-form_logo" className="logo" src="/klack_logo.svg" alt="logo" />
        <div id="login-form_signup">
          <span>New to Klack?</span>
          <br></br>
          <a href="/signup">Create an account</a>
        </div>
      </header>
      <div id="login_form-body">
        <h1>Log in to Slack</h1>
        <p>We suggest using the <b>email address you use at work.</b></p>
        {
          serverErrors.other.length > 0 && serverErrors.other.map(error => (
            <span id="login_form-other_server_errors" className="validation_errors">
              <i className="fa-solid fa-circle-exclamation" />
              {error}
            </span>
          ))
        }
        <form id="login_form-form">
          <div id="login_form-email_input" className={`input ${Object.values(validationErrors.email).length || Object.values(serverErrors.email).length ? "error" : ""}`}>
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
                <span id="login_form-email_validation_errors" className="validation_errors">
                  <i className="fa-solid fa-circle-exclamation" />
                  {error}
                </span>
              ))
            }
            {
              serverErrors.email.length > 0 && serverErrors.email.map(error => (
                <span id="login_form-email_server_errors" className="validation_errors">
                  <i className="fa-solid fa-circle-exclamation" />
                  {error}
                </span>
              ))
            }
          </div>

          <div id="login_form-password_input" className={`input ${Object.values(validationErrors.password).length || Object.values(serverErrors.password).length ? "error" : ""}`}>
            <label htmlFor="password">Password</label>
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="●●●●●●"
              value={onchangePassword}
              onChange={(e) => {
                setOnchangePassword(e.target.value)
              }}
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
                <span id="login_form-password_validation_errors" className="validation_errors">
                  <i className="fa-solid fa-circle-exclamation" />
                  {error}
                </span>
              ))
            }
            {
              serverErrors.password.length > 0 && serverErrors.password.map(error => (
                <span id="login_form-password_server_errors" className="validation_errors">
                  <i className="fa-solid fa-circle-exclamation" />
                  {error}
                </span>
              ))
            }
          </div>
          <button
            id="login_form-submit_button"
            disabled={Object.values(validationErrors).flat().length || !emailEdited || !passwordEdited}
            onClick={handleSubmit}
          >
            Log In
          </button>
          <button id="login_form-demo_button_1" onClick={(e) => handleDemo(e, 1)}>
            Demo User 1
          </button>
          <button id="login_form-demo_button_2" onClick={(e) => handleDemo(e, 2)}>
            Demo User 2
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginFormPage;
