import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import * as channelActions from "../../store/channels";
import * as workspaceActions from "../../store/workspaces";
import * as messageActions from "../../store/messages";
import { useModal } from '../../context/Modal';
import { usePopup } from "../../context/Popup";
import { Loader } from "../Loader";
import "./CreateChannel.css"

export function CreateChannel({ type, channel, workspace }) {
  const dispatch = useDispatch();
  const [name, setName] = useState(type === "edit" ? channel.name : "")
  const [nameEdited, setNameEdited] = useState(type === "edit" ? true : false)
  const [description, setDescription] = useState(type === "edit" ? channel.description : "")
  const [validationErrors, setValidationErrors] = useState({ name: [] })
  const [serverErrors, setServerErrors] = useState({ name: [], other: [] })
  const { closeModal } = useModal();
  const { setPopupContent, closePopup } = usePopup()

  const handleSubmit = async (e) => {
    e.preventDefault()
    let text
    if (type === "edit") {
      text = "Updating Channel ..."
    } else if (type === "create") {
      text = "Creating Channel ..."
    }
    setPopupContent(<Loader text={text} />)
    const newChannel = {
      name,
      description: description ? description : null
    }
    let data
    if (type === "edit") {
      data = await dispatch(channelActions.editChannel(channel.id, newChannel))
    } else if (type === "create") {
      data = await dispatch(channelActions.createChannel(workspace.id, newChannel))
    }
    const errors = { name: [], other: [] }
    if (Array.isArray(data)) {
      const nameErrors = data.filter(error => error.startsWith("name"))
      const otherErrors = data.filter(error => !error.startsWith("name"))
      errors.name = nameErrors.map(error => error.split(" : ")[1])
      errors.other = otherErrors
      closePopup()
      setServerErrors(errors)
    } else {
      if (type === "create") {
        const message = data.message
        const workspace = data.workspace
        await dispatch(workspaceActions.addWorkspace(workspace))
        await dispatch(messageActions.addMessage(message))
      } else if (type === "edit") {
        const messages = data.messages
        if (messages) {
          await dispatch(messageActions.addMessages(messages))
        }
      }
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
      <h2>{(type === "edit" && "Edit Channel") || (type === "create" && "Create Channel")}</h2>
      <div
        className={`input${Object.values(validationErrors.name).length || Object.values(serverErrors).flat().length ? " error" : ""}`}
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
          }}
        />
      </div>
      <p>Let people know what this channel is for.</p>
      <button
        onClick={handleSubmit}
        disabled={validationErrors.name.length || !nameEdited}
      >
        {(type === "edit" && "Update Channel") || (type === "create" && "Create Channel")}
      </button>
    </form>
  )
}
