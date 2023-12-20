import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./CreateWorkspace.css"
import AvatarEditor from 'react-avatar-editor'
import * as sessionActions from "../../store/session";
import * as workspaceActions from "../../store/workspaces";
import * as userActions from "../../store/users";
import * as channelActions from "../../store/channels";
import * as messageActions from "../../store/messages";
import { useModal } from '../../context/Modal';
import { usePopup } from "../../context/Popup";
import { Loader } from "../Loader";

export function CreateWorkspace() {
  const dispatch = useDispatch();
  const randomElement = (arr) => {
    const random = Math.floor(Math.random() * arr.length);
    return arr[random];
  }
  const workspaceIcons = [
    "/images/workspace_icons/workspace_icon_1.webp",
    "/images/workspace_icons/workspace_icon_2.webp",
    "/images/workspace_icons/workspace_icon_3.webp"
  ]
  const profileImages = [
    "/images/profile_images/profile_images_1.png",
    "/images/profile_images/profile_images_2.png",
    "/images/profile_images/profile_images_3.png",
    "/images/profile_images/profile_images_4.png",
    "/images/profile_images/profile_images_5.png",
    "/images/profile_images/profile_images_6.png",
    "/images/profile_images/profile_images_7.png",
  ]
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [nameEdited, setNameEdited] = useState(false)
  const [nickname, setNickname] = useState("")
  const [nicknameEdited, setNicknameEdited] = useState(false)
  const [workspaceIcon, setWorkspaceIcon] = useState("")
  const [workspaceIconUrl, setWorkspaceIconUrl] = useState(randomElement(workspaceIcons))
  const [workspaceIconScale, setWorkspaceIconScale] = useState(0)
  const [profileImage, setProfileImage] = useState("")
  const [profileImageUrl, setProfileImageUrl] = useState(randomElement(profileImages))
  const [profileImageScale, setProfileImageScale] = useState(0)
  const [validationErrors, setValidationErrors] = useState({ name: [], nickname: [] })
  const [serverErrors, setServerErrors] = useState({ name: [], icon: [], nickname: [], image: [], other: [] })
  const sessionUser = useSelector(state => state.session.user);
  const workspaceIconRef = useRef()
  const iconUploadRef = useRef()
  const profileImageRef = useRef()
  const imageUploadRef = useRef()
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
    setPopupContent(<Loader text="Creating Workspace ..." />)

    let icon
    let image
    // If the user uploaded an image or changed the image scale, create a file from the canvas
    if (workspaceIconRef && (workspaceIcon || workspaceIconScale !== 0)) {
      const iconScaled = workspaceIconRef.current.getImage()
      icon = await new Promise(resolve => iconScaled.toBlob(blob => {
        const file = new File([blob], "workspace_icon", { lastModified: new Date().getTime(), type: workspaceIcon ? workspaceIcon.type : "image/png" })
        resolve(file)
      }))
    }
    if (profileImageRef && (profileImage || profileImageScale !== 0)) {
      const imageScaled = profileImageRef.current.getImage()
      image = await new Promise(resolve => imageScaled.toBlob(blob => {
        const file = new File([blob], "profile_image", { lastModified: new Date().getTime(), type: profileImage ? profileImage.type : "image/png" })
        resolve(file)
      }))
    }

    let iconUrl
    let imageUrl
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
          prev.icon = ["An error occurred. Please try again."]
          return { ...prev }
        })
        closePopup()
        return
      }
    }
    if (image) {
      const imageFormData = new FormData()
      const ext = extensionList[image.type]
      imageFormData.append("image", image, "image." + ext)
      const imageResponse = await fetch("api/images/new", {
        method: "POST",
        body: imageFormData
      })
      if (imageResponse.ok) {
        const data = await imageResponse.json()
        imageUrl = data.url
      } else if (imageResponse.status < 500) {
        const data = await imageResponse.json()
        if (data.errors) {
          setServerErrors((prev) => {
            prev.image = [data.errors]
            return { ...prev }
          })
        }
        closePopup()
        return
      } else {
        setServerErrors((prev) => {
          prev.image = ["An error occurred. Please try again."]
          return { ...prev }
        })
        closePopup()
        return
      }
    }

    const workspace = {
      name,
      iconUrl: iconUrl ? iconUrl : workspaceIconUrl,
      nickname,
      imageUrl: imageUrl ? imageUrl : profileImageUrl
    }

    let data = await dispatch(workspaceActions.createWorkspace(workspace))
    const errors = { name: [], icon: [], nickname: [], image: [], other: [] }
    if (Array.isArray(data)) {
      const nameErrors = data.filter(error => error.startsWith("name"))
      const iconErrors = data.filter(error => error.startsWith("icon"))
      const nicknameErrors = data.filter(error => error.startsWith("nickname"))
      const imageErrors = data.filter(error => error.startsWith("profile"))
      const otherErrors = data.filter(error => !error.startsWith("name") && !error.startsWith("icon") && !error.startsWith("nickname") && !error.startsWith("profile"))
      errors.name = nameErrors.map(error => error.split(" : ")[1])
      errors.icon = iconErrors.map(error => error.split(" : ")[1])
      errors.nickname = nicknameErrors.map(error => error.split(" : ")[1])
      errors.image = imageErrors.map(error => error.split(" : ")[1])
      errors.other = otherErrors
      setServerErrors(errors)
      closePopup()
    } else {
      const newSessionUser = { ...sessionUser, activeWorkspaceId: data.workspace.id }
      const workspaceUser = data.workspaceUser
      const channel = data.channel
      const message = data.message
      const prevActiveChannel = data.prevActiveChannel
      await dispatch(userActions.addUser(workspaceUser))
      await dispatch(channelActions.addChannel(channel))
      await dispatch(workspaceActions.addWorkspace(data.workspace))
      await dispatch(messageActions.addMessage(message))
      await dispatch(sessionActions.setUser(newSessionUser))
      if (prevActiveChannel) {
        await dispatch(channelActions.addChannel(prevActiveChannel))
      }
      closePopup()
      closeModal()
    }
  }

  useEffect(() => {
    const errors = { name: [], nickname: [] }
    if (nameEdited && !name) {
      errors.name.push("Workspace name is required")
    }
    if (name && name.length > 80) {
      errors.name.push("Workspace name must be at most 80 characters long")
    }
    if (nicknameEdited && !nickname) {
      errors.nickname.push("Name is required")
    }
    if (nickname && nickname.length > 80) {
      errors.nickname.push("Name must be at most 80 characters long")
    }
    setValidationErrors(errors)
  }, [name, nameEdited, nickname, nicknameEdited])

  return (
    <div id="create-workspace_container">
      <span id="create-workspace_step">
        Step {step} of 2
      </span>
      <form
        id="create-workspace_workspace-form"
        className={step === 1 ? "" : "hidden"}
      >
        <div>
          <h2>What's the name of your company or team?</h2>
          <p>This will be the name of your Klack workspace — choose something that your team will recognize.</p>
          <div
            className={`input ${Object.values(validationErrors.name).length || Object.values(serverErrors.name).length ? "error" : ""}`}
            id="create-workspace_workspace-name-input"
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
                setNameEdited(true)
              }}
            />
            <span id="create-workspace_workspace-name-length-limit">
              {80 - name.length}
            </span>
            {
              serverErrors.name.length > 0 && serverErrors.name.map(error => (
                <span id="create-workspace_name-server-errors" className="validation_errors">
                  <i className="fa-solid fa-circle-exclamation" />
                  {error}
                </span>
              ))
            }
            {
              validationErrors.name.length > 0 && validationErrors.name.map(error => (
                <span id="create-workspace_name-validation-errors" className="validation_errors">
                  <i className="fa-solid fa-circle-exclamation" />
                  {error}
                </span>
              ))
            }
          </div>
          <h3>Your workspace icon <span> (optional)</span></h3>
          <div id="create-workspace_workspace-icon-upload">
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
                id="create-workspace_workspace-icon-slider"
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
                id="create-workspace_workspace-icon-upload_button"
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
              <span id="create-workspace_icon-server-errors" className="validation_errors">
                <i className="fa-solid fa-circle-exclamation" />
                {error}
              </span>
            ))
          }
        </div>
        <button
          onClick={(e) => {
            e.preventDefault()
            setStep(2)
          }}
          disabled={Object.values(validationErrors).flat().length || !nameEdited}
        >
          Next
        </button>
      </form>
      <form id="create-workspace_workspace-user-form" className={step === 2 ? "" : "hidden"}>
        <div>
          <h2>What’s your name?</h2>
          <p>Adding your name and profile photo helps your teammates recognize and connect with you more easily.</p>
          <div
            className={`input ${Object.values(validationErrors.nickname).length || Object.values(serverErrors.nickname).length ? "error" : ""}`}
            id="create-workspace_nickname-input"
          >
            <label htmlFor="nickname">
              Name
            </label>
            <input
              name="nickname"
              placeholder="Ex: John Smith"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value)
                setNicknameEdited(true)
              }}
            />
            <span id="create-workspace_nickname-length-limit">
              {80 - nickname.length}
            </span>
            {
              serverErrors.nickname.length > 0 && serverErrors.nickname.map(error => (
                <span id="create-workspace_nickname-server-errors" className="validation_errors">
                  <i className="fa-solid fa-circle-exclamation" />
                  {error}
                </span>
              ))
            }
            {
              validationErrors.nickname.length > 0 && validationErrors.nickname.map(error => (
                <span id="create-workspace_nickname-validation-errors" className="validation_errors">
                  <i className="fa-solid fa-circle-exclamation" />
                  {error}
                </span>
              ))
            }
          </div>
          <h3>Your profile photo <span> (optional)</span></h3>
          <div id="create-workspace_profile-image-upload">
            <div>
              <AvatarEditor
                ref={profileImageRef}
                image={profileImageUrl}
                width={110}
                height={110}
                border={0}
                scale={1 + profileImageScale / 100}
                crossOrigin="anonymous"
              />
              <input
                type="range"
                min="-50"
                max="50"
                step="1"
                value={profileImageScale}
                id="create-workspace_profile-image-slider"
                onChange={(e) => {
                  setProfileImageScale(e.target.value)
                }}
              />
            </div>
            <input
              ref={imageUploadRef}
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
                  setProfileImage(e.target.files[0])
                  setProfileImageUrl(URL.createObjectURL(e.target.files[0]))
                }
              }}
              onClick={(e) => e.target.value = null}
            />
            <label htmlFor="image">
              <p>Help your teammates know they’re talking to the right person.</p>
              <button
                id="create-workspace_profile-image-upload_button"
                onClick={(e) => {
                  e.preventDefault();
                  imageUploadRef.current.click();
                }}
              >
                Upload Photo
              </button>
            </label>
          </div>
          {
            serverErrors.image.length > 0 && serverErrors.image.map(error => (
              <span id="create-workspace_image-server-errors" className="validation_errors">
                <i className="fa-solid fa-circle-exclamation" />
                {error}
              </span>
            ))
          }
          {
            serverErrors.other.length > 0 && serverErrors.other.map(error => (
              <span id="create-workspace_other-server-errors" className="validation_errors">
                <i className="fa-solid fa-circle-exclamation" />
                {error}
              </span>
            ))
          }
        </div>
        <div id="create-workspace_submit-buttons">
          <button
            onClick={(e) => {
              e.preventDefault()
              setStep(1)
            }}
          >
            Previous
          </button>
          <button
            onClick={handleSubmit}
            disabled={Object.values(validationErrors).flat().length || !nicknameEdited}
          >
            Create Workspace
          </button>
        </div>
      </form>

    </div>
  )
}
