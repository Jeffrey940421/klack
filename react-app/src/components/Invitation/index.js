import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createInvitation } from "../../store/workspaces";
import { usePopup } from "../../context/Popup";
import { useModal } from "../../context/Modal";
import "./Invitation.css"

function SentInvitation({ sentInvitations }) {
  const { closePopup } = usePopup()

  return (
    <div id="sent-invitations">
      <h2>Congradulations!</h2>
      <span>Invitations haven been successfully sent to
        <span> {sentInvitations.join(', ')}</span>.
      </span>
      <button
        onClick={() => closePopup()}
      >
        <i className="fa-solid fa-x" />
      </button>
    </div>
  )
}

export function Invitation() {
  const dispatch = useDispatch();
  const [emails, setEmails] = useState([])
  const [newEmail, setNewEmail] = useState("")
  const [validationErrors, setValidationErrors] = useState([])
  const [focused, setFocuesd] = useState(false)
  const [serverErrors, setServerErrors] = useState({ emails: [], other: [] })
  const { setPopupContent } = usePopup()
  const { closeModal } = useModal()
  const [response, setResponse] = useState({})
  const workspace = useSelector((state) => state.workspaces.activeWorkspace)
  const user = useSelector((state) => state.session.user)


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

    if (data.filter(res => res).length) {
      const res = {}

      data.forEach((resData, i) => {
        res[emails[i]] = resData
      })
      setResponse(res)
      const errors = { emails: [], other: [] }
      const emailErrors = data.flat().filter(error => error && error.startsWith("recipient"))
      const otherErrors = data.flat().filter(error => error && !error.startsWith("recipient"))
      errors.emails = emailErrors.map(error => error.split(" : ")[1])
      errors.other = otherErrors
      setServerErrors(errors)
      const sentInvitations = emails.filter((email, i) => !data[i])
      if (sentInvitations.length) {
        setPopupContent(<SentInvitation sentInvitations={sentInvitations} />)
      }
    } else {
      const sentInvitations = emails.filter((email, i) => !data[i])
      setPopupContent(<SentInvitation sentInvitations={sentInvitations} />)
      closeModal()
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
      <div id="invitation_input" className={(focused ? "focused " : "") + (validationErrors.filter(error => error !== "No Error").length || Object.values(serverErrors).flat().length ? "error" : "")}>
        {emails.map(((email, i) => {
          return (
            <div className={`invitation_email${(validationErrors[i] === "No Error" && !response[email]) ? "" : " error"}`} key={i}>
              <span>{email}</span>
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
          placeholder="name@example.com"
          value={newEmail}
          onChange={(e) => {
            setNewEmail(e.target.value)
            e.target.style.width = "150px"
            if (e.target.scrollWidth > 150) {
              e.target.style.width = `${e.target.scrollWidth}px`
            }
          }}
          onFocus={() => setFocuesd(true)}
          onBlur={(e) => {
            setFocuesd(false)
            if (e.target.value) {
              setEmails((prev) => {
                prev.push(e.target.value)
                return [...prev]
              })
              setNewEmail("")
              e.target.style.width = "150px"
            }
          }}
          style={{ width: "150px" }}
        />
      </div>
      {
        validationErrors.length > 0 && validationErrors.filter(error => error !== "No Error").map(error => (
          <span id="invitation_email-validation-errors" className="validation_errors">
            <i className="fa-solid fa-circle-exclamation" />
            {error}
          </span>
        ))
      }
      {
        serverErrors.emails.length > 0 && serverErrors.emails.map(error => (
          <span id="invitation_email-server-errors" className="validation_errors">
            <i className="fa-solid fa-circle-exclamation" />
            {error}
          </span>
        ))
      }
      {
        serverErrors.other.length > 0 && serverErrors.other.map(error => (
          <span id="invitation_email-server-errors" className="validation_errors">
            <i className="fa-solid fa-circle-exclamation" />
            {error}
          </span>
        ))
      }
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
