import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AvatarEditor from 'react-avatar-editor'
import * as workspaceActions from "../../store/workspaces";
import { useModal } from '../../context/Modal';
import { usePopup } from "../../context/Popup";
import { Loader } from "../Loader";
import "./EditWorkspace.css"

export function EditWorkspace({ workspace }) {
  const dispatch = useDispatch();
  const [name, setName] = useState(workspace.name)
  const [workspaceIcon, setWorkspaceIcon] = useState("")
  const [workspaceIconUrl, setWorkspaceIconUrl] = useState(workspace.iconUrl)
  const [workspaceIconScale, setWorkspaceIconScale] = useState(0)
  const [validationErrors, setValidationErrors] = useState({ name: [] })
  const [serverErrors, setServerErrors] = useState({ name: [], icon: [], other: [] })
  const workspaceIconRef = useRef()
  const iconUploadRef = useRef()
  const { closeModal } = useModal();
  const { setPopupContent, closePopup } = usePopup();

  const extensionList = {
    "image/apng": "apng",
    "image/avif": "avif",
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/svg+xml": "svg",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/x-icon": "icon",
    "image/tiff": "tiff"
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (Object.values(validationErrors).flat().length) return
    setPopupContent(<Loader text="Updating Workspace ..." />)

    let icon
    // If the user uploaded an image or changed the image scale, create a file from the canvas
    if (workspaceIconRef && (workspaceIcon || workspaceIconScale !== 0)) {
      const iconScaled = workspaceIconRef.current.getImage()
      icon = await new Promise(resolve => iconScaled.toBlob(blob => {
        const file = new File([blob], "workspace_icon", { lastModified: new Date().getTime(), type: workspaceIcon ? workspaceIcon.type : "image/png" })
        resolve(file)
      }))
    }

    let iconUrl
    // If the image file is created, upload the image to the server
    if (icon) {
      const iconFormData = new FormData()
      const ext = extensionList[icon.type]
      iconFormData.append("image", icon, "icon." + ext)
      const iconResponse = await fetch("api/images/new", {
        method: "POST",
        body: iconFormData
      })
      if (iconResponse.ok) {
        const data = await iconResponse.json()
        iconUrl = data.url
      } else if (iconResponse.status < 500) {
        const data = await iconResponse.json()
        if (data.errors) {
          setServerErrors((prev) => {
            prev.icon = [data.errors]
            return { ...prev }
          })
        }
        closePopup()
        return
      } else {
        setServerErrors((prev) => {
          prev.icon.push("An error occurred. Please try again.")
          return { ...prev }
        })
        closePopup()
        return
      }
    }

    const updatedWorkspace = {
      name,
      iconUrl
    }

    let data = await dispatch(workspaceActions.editWorkspace(workspace.id, updatedWorkspace))
    const errors = { name: [], icon: [], other: [] }
    if (data) {
      const nameErrors = data.filter(error => error.startsWith("name"))
      const iconErrors = data.filter(error => error.startsWith("icon"))
      const otherErrors = data.filter(error => !error.startsWith("name") && !error.startsWith("icon"))
      errors.name = nameErrors.map(error => error.split(" : ")[1])
      errors.icon = iconErrors.map(error => error.split(" : ")[1])
      errors.other = otherErrors
      setServerErrors(errors)
      closePopup()
    } else {
      closePopup()
      closeModal()
    }
  }

  useEffect(() => {
    const errors = { name: [] }
    if (!name) {
      errors.name.push("Workspace name is required")
    }
    if (name.length > 80) {
      errors.name.push("Workspace name must be at most 80 characters long")
    }
    setValidationErrors(errors)
  }, [name])

  return (
    <div id="edit-workspace_container">
      <form id="edit-workspace_workspace-form">
        <div>
          <h2>What's the name of your company or team?</h2>
          <p>This will be the name of your Klack workspace — choose something that your team will recognize.</p>
          <div
            className={`input ${Object.values(validationErrors.name).length || Object.values(serverErrors.name).length ? "error" : ""}`}
            id="edit-workspace_workspace-name-input"
          >
            <label htmlFor="name">
              Workspace Name
            </label>
            <input
              name="name"
              placeholder="Ex: Acem Marketing or Acme Co"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
            />
            <span id="edit-workspace_workspace-name-length-limit">
              {80 - name.length}
            </span>
            {
              serverErrors.name.length > 0 && serverErrors.name.map(error => (
                <span id="edit-workspace_name-server-errors" className="validation_errors">
                  <i className="fa-solid fa-circle-exclamation" />
                  {error}
                </span>
              ))
            }
            {
              validationErrors.name.length > 0 && validationErrors.name.map(error => (
                <span id="edit-workspace_name-validation-errors" className="validation_errors">
                  <i className="fa-solid fa-circle-exclamation" />
                  {error}
                </span>
              ))
            }
          </div>
          <h3>Your workspace icon <span> (optional)</span></h3>
          <div id="edit-workspace_workspace-icon-upload">
            <div>
              <AvatarEditor
                ref={workspaceIconRef}
                image={workspaceIconUrl}
                width={110}
                height={110}
                border={0}
                scale={1 + workspaceIconScale / 100}
                crossOrigin="anonymous"
              />
              <input
                type="range"
                min="-50"
                max="50"
                step="1"
                value={workspaceIconScale}
                id="edit-workspace_workspace-icon-slider"
                onChange={(e) => setWorkspaceIconScale(e.target.value)}
              />
            </div>
            <input
              ref={iconUploadRef}
              type="file"
              className="hidden"
              accept=".png, .jpg, .jpeg, .gif, .webp"
              multiple={false}
              name="icon"
              onChange={(e) => {
                const file = e.target.files[0]
                const fileName = file.name
                const ext = fileName.split(".")[1]
                const validExt = ["png", "jpg", "jpeg", "gif", "webp"]
                // Accept the file only when the extension is valid
                if (validExt.includes(ext)) {
                  setWorkspaceIcon(e.target.files[0])
                  setWorkspaceIconUrl(URL.createObjectURL(e.target.files[0]))
                }
              }}
              onClick={(e) => e.target.value = null}
            />
            <label htmlFor="icon">
              <p>Help you and your teammates quickly identify this workspace.</p>
              <button
                id="edit-workspace_workspace-icon-upload_button"
                onClick={(e) => {
                  e.preventDefault();
                  iconUploadRef.current.click();
                }}
              >
                Upload Icon
              </button>
            </label>
          </div>
          {
            serverErrors.icon.length > 0 && serverErrors.icon.map(error => (
              <span id="edit-workspace_icon-server-errors" className="validation_errors">
                <i className="fa-solid fa-circle-exclamation" />
                {error}
              </span>
            ))
          }
          {
            serverErrors.other.length > 0 && serverErrors.other.map(error => (
              <span id="edit-profile_other-server-errors" className="validation_errors">
                <i className="fa-solid fa-circle-exclamation" />
                {error}
              </span>
            ))
          }
        </div>
        <button
          onClick={handleSubmit}
          disabled={Object.values(validationErrors).flat().length}
        >
          Update Workspace
        </button>
      </form>

    </div>
  )
}
