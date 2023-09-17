import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Redirect } from "react-router-dom";
import "./CreateChannel.css"
import { createChannel, editChannel } from "../../store/channels";
import { authenticate } from "../../store/session";
import { useModal } from '../../context/Modal';
import { usePopup } from "../../context/Popup";
import { Loader } from "../Loader";

export function CreateChannel({ type, channel, workspace }) {
  const dispatch = useDispatch();
  const [name, setName] = useState(type === "edit" ? channel.name : "")
  const [nameEdited, setNameEdited] = useState(type === "edit" ? true : false)
  const [description, setDescription] = useState(type === "edit" ? channel.description : "")
  const [descriptionEdited, setDescriptionEdited] = useState(type === "edit" ? true : false)
  const [validationErrors, setValidationErrors] = useState({ name: [] })
  const [serverErrors, setServerErrors] = useState({ name: [], other: [] })
  const { closeModal } = useModal();
  const { setPopupContent, closePopup } = usePopup()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setPopupContent(<Loader text={type === "edit" ? "Updating Channel ..." : "Creating Channel ..."} />)
    const new_channel = {
      name,
      description: description ? description : null
    }
    let data = type === "edit" ?
      await dispatch(editChannel(channel.id, new_channel)) :
      await dispatch(createChannel(workspace.id, new_channel))
    const errors = { name: [], other: [] }
    if (data) {
      const nameErrors = data.filter(error => error.startsWith("name"))
      const otherErrors = data.filter(error => !error.startsWith("name"))
      errors.name = nameErrors.map(error => error.split(" : ")[1])
      errors.other = otherErrors
      closePopup()
      setServerErrors(errors)
    } else {
      await dispatch(authenticate())
      closePopup()
      closeModal()
    }
  }

  useEffect(() => {
    const errors = { name: [] }

    if (nameEdited && !name) {
      errors.name.push("Workspace name is required")
    }

    if (name && name.length > 80) {
      errors.name.push("Workspace name must be at most 80 characters long")
    }

    setValidationErrors(errors)
  }, [name, nameEdited])

  return (
    <form id="create-channel_form">
      <h2>{type === "edit" ? "Edit Channel" : "Create Channel"}</h2>
      <div
        className={`input ${Object.values(validationErrors.name).length || Object.values(serverErrors).flat().length ? "error" : ""}`}
        id="create-channel_name-input"
      >
        <label htmlFor="name">
          Channel Name
        </label>
        <span id="create-channel_hash">
          <i className="fa-solid fa-hashtag" />
        </span>
        <input
          disabled={channel && channel.name === "general"}
          className={channel && channel.name === "general" ? "disabled-input" : ""}
          name="name"
          placeholder="Ex: plan-budget"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setNameEdited(true)
          }}
        />
        <span id="create-channel_name-length-limit">
          {80 - name.length}
        </span>
        {
          serverErrors.name.length > 0 && serverErrors.name.map(error => (
            <span id="create-channel_name-server-errors" className="validation_errors">
              <i className="fa-solid fa-circle-exclamation" />
              {error}
            </span>
          ))
        }
        {
          serverErrors.other.length > 0 && serverErrors.other.map(error => (
            <span id="create-channel_other-server-errors" className="validation_errors">
              <i className="fa-solid fa-circle-exclamation" />
              {error}
            </span>
          ))
        }
        {
          validationErrors.name.length > 0 && validationErrors.name.map(error => (
            <span id="create-channel_name-validation-errors" className="validation_errors">
              <i className="fa-solid fa-circle-exclamation" />
              {error}
            </span>
          ))
        }
        <p>Channels are where conversations happen around a topic. Use a name that is easy to find and understand.</p>
      </div>
      <div
        className="input"
        id="create-channel_description-input"
      >
        <label htmlFor="description">
          Channel Description (Optional)
        </label>
        <textarea
          name="description"
          placeholder="Add a description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            setDescriptionEdited(true)
          }}
        />
        <p>Let people know what this channel is for.</p>
      </div>
      <button
        onClick={handleSubmit}
      >
        {type === "edit" ? "Update Channel" : "Create Channel"}
      </button>
    </form>
  )
}
