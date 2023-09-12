import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createInvitation } from "../../store/workspaces";
import { usePopup } from "../../context/Popup";

export function Invitation({ workspace, user }) {
  const dispatch = useDispatch();
  const [emails, setEmails] = useState([])
  const [newEmail, setNewEmail] = useState("")
  const [validationErrors, setValidationErrors] = useState([])
  const [serverErrors, setServerErrors] = useState({ emails: [], other: [] })
  const { setPopupContent } = usePopup()

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const sendInvitation = async (e) => {
    e.preventDefault();

    const data = await Promise.all(
      emails.map(email => {
        return dispatch(createInvitation(workspace.id, email))
      })
    )

    console.log(data)

    if (data.filter(res => res).length) {
      const errors = { emails: [], other: [] }
      const emailErrors = data.flat().filter(error => error.startsWith("recipient"))
      const otherErrors = data.flat().filter(error => !error.startsWith("recipient"))
      errors.emails = emailErrors.map(error => error.split(" : ")[1])
      errors.other = otherErrors
      setServerErrors(errors)
      const sentInvitations = emails.filter((email, i) => !data[i])
      if (sentInvitations.length) {
        setPopupContent(
          <>
            <h1>Invitations haven been sent to </h1>
            {sentInvitations.map(email => {
              return (
                <h1>{email}</h1>
              )
            })}
          </>
        )
      }
    } else {
      setPopupContent(
        <>
          <h1>Invitations haven been sent to </h1>
          {emails.filter((email, i) => !data[i]).map(email => {
            return (
              <h1>{email}</h1>
            )
          })}
        </>
      )
    }
  }

  useEffect(() => {
    const errors = []

    for (let email of emails) {
      if (!validateEmail(email)) {
        errors.push(`${email} is not a valid email`)
      } else if (Object.values(workspace.users).map(user => user.email).includes(email)) {
        errors.push(`User ${email} is already in the workspace`)
      } else if (email === user.email) {
        errors.push(`Users are not allowed to invite themselves`)
      } else if (Object.values(workspace.associatedInvitations)
        .filter(invitation => invitation.status === "pending")
        .map(invitation => invitation.recipientEmail)
        .includes(email)) {
        errors.push(`User ${email} has already received an invitation. Please wait for his/her response patiently`)
      } else {
        errors.push("No Error")
      }
    }

    setValidationErrors(errors)

  }, [emails, user, workspace])

  return (
    <div id="invitation_container">
      <h2>Invite people to {workspace.name}</h2>
      <span>To:</span>
      <div id="invitation_input">
        {emails.map(((email, i) => {
          return (
            <div className={`invitation_email${validationErrors[i] === "No Error" ? "" : " error"}`} key={i}>
              {email}
              <button
                onClick={() => setEmails((prev) => {
                  prev.splice(i, 1);
                  return [...prev]
                })}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          )
        }))}
        <input
          type="text"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onBlur={(e) => {
            if (e.target.value) {
              setEmails((prev) => {
                prev.push(e.target.value)
                return [...prev]
              })
              setNewEmail("")
            }
          }}
        />
        {
          validationErrors.length > 0 && validationErrors.filter(error => error !== "No Error").map(error => (
            <span id="signup_form-email_validation_errors" className="validation_errors">
              <i className="fa-solid fa-circle-exclamation" />
              {error}
            </span>
          ))
        }
        {
          serverErrors.emails.length > 0 && serverErrors.emails.map(error => (
            <span id="signup_form-email_validation_errors" className="validation_errors">
              <i className="fa-solid fa-circle-exclamation" />
              {error}
            </span>
          ))
        }
      </div>
      <button
        id="invitation_button"
        onClick={sendInvitation}
        disabled={validationErrors.filter(error => error !== "No Error").length || !emails.length}
      >
        Send Invitation
      </button>
    </div>
  )
}
