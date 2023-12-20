import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AvatarEditor from 'react-avatar-editor'
import * as sessionActions from "../../store/session";
import * as workspaceActions from "../../store/workspaces";
import * as userActions from "../../store/users";
import * as channelActions from "../../store/channels";
import * as messageActions from "../../store/messages";
import { useModal } from '../../context/Modal';
import { usePopup } from "../../context/Popup";
import { Loader } from "../Loader";
import "./JoinWorkspace.css"

export function JoinWorkspace({ invitation }) {
  const dispatch = useDispatch();
  const randomElement = (arr) => {
    const random = Math.floor(Math.random() * arr.length);
    return arr[random];
  }
  const profileImages = [
    "/images/profile_images/profile_images_1.png",
    "/images/profile_images/profile_images_2.png",
    "/images/profile_images/profile_images_3.png",
    "/images/profile_images/profile_images_4.png",
    "/images/profile_images/profile_images_5.png",
    "/images/profile_images/profile_images_6.png",
    "/images/profile_images/profile_images_7.png",
  ]
  const [nickname, setNickname] = useState("")
  const [nicknameEdited, setNicknameEdited] = useState(false)
  const [profileImage, setProfileImage] = useState("")
  const [profileImageUrl, setProfileImageUrl] = useState(randomElement(profileImages))
  const [profileImageScale, setProfileImageScale] = useState(0)
  const [validationErrors, setValidationErrors] = useState({ nickname: [] })
  const [serverErrors, setServerErrors] = useState({ nickname: [], image: [], other: [] })
  const profileImageRef = useRef()
  const imageUploadRef = useRef()
  const { closeModal } = useModal();
  const { setPopupContent, closePopup } = usePopup();
  const sessionUser = useSelector(state => state.session.user)

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
    setPopupContent(<Loader text="Joining Workspace ..." />)

    let image
    // If the user uploaded an image or changed the image scale, create a file from the canvas
    if (profileImageRef && (profileImage || profileImageScale !== 0)) {
      const imageScaled = profileImageRef.current.getImage()
      image = await new Promise(resolve => imageScaled.toBlob(blob => {
        const file = new File([blob], "profile_image", { lastModified: new Date().getTime(), type: profileImage ? profileImage.type : "image/png" })
        resolve(file)
      }))
    }

    let imageUrl
    // If the image file is created, upload the image to the server
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
            prev.image.push(data.errors)
            return { ...prev }
          })
        }
        closePopup()
        return
      } else {
        setServerErrors((prev) => {
          prev.image.push("An error occurred. Please try again.")
          return { ...prev }
        })
        closePopup()
        return
      }
    }

    const profile = {
      nickname,
      imageUrl: imageUrl ? imageUrl : profileImageUrl
    }

    let data = await dispatch(workspaceActions.joinWorkspace(invitation.workspaceId, profile))
    const errors = { nickname: [], image: [], other: [] }
    if (Array.isArray(data)) {
      const nicknameErrors = data.filter(error => error.startsWith("nickname"))
      const imageErrors = data.filter(error => error.startsWith("profile"))
      const otherErrors = data.filter(error => !error.startsWith("nickname") && !error.startsWith("profile"))
      errors.nickname = nicknameErrors.map(error => error.split(" : ")[1])
      errors.image = imageErrors.map(error => error.split(" : ")[1])
      errors.other = otherErrors
      setServerErrors(errors)
      closePopup()
    } else {
      const newSessionUser = { ...sessionUser, activeWorkspaceId: invitation.workspaceId }
      const workspaceUsers = data.workspaceUsers
      const channel = data.channel
      const messages = data.messages
      const prevActiveChannel = data.prevActiveChannel
      await dispatch(userActions.addUsers(workspaceUsers))
      await dispatch(channelActions.addChannel(channel))
      await dispatch(messageActions.addMessages(messages))
      await dispatch(sessionActions.setUser(newSessionUser))
      if (prevActiveChannel) {
        await dispatch(channelActions.addChannel(prevActiveChannel))
      }
      await dispatch(sessionActions.processInvitation(invitation.id, "accept"))
      closePopup()
      closeModal()
    }

  }

  useEffect(() => {
    const errors = { nickname: [] }
    if (nicknameEdited && !nickname) {
      errors.nickname.push("Name is required")
    }
    if (nicknameEdited && nickname.length > 80) {
      errors.nickname.push("Name must be at most 80 characters long")
    }
    setValidationErrors(errors)
  }, [nickname])

  return (
    <div id="join-workspace_container">
      <form id="join-workspace_workspace-user-form">
        <div>
          <h2>What’s your name?</h2>
          <p>Adding your name and profile photo helps your teammates recognize and connect with you more easily.</p>
          <div
            className={`input ${Object.values(validationErrors.nickname).length || Object.values(serverErrors.nickname).length ? "error" : ""}`}
            id="join-workspace_nickname-input"
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
            <span id="join-workspace_nickname-length-limit">
              {80 - nickname.length}
            </span>
            {
              serverErrors.nickname.length > 0 && serverErrors.nickname.map(error => (
                <span id="join-workspace_nickname-server-errors" className="validation_errors">
                  <i className="fa-solid fa-circle-exclamation" />
                  {error}
                </span>
              ))
            }
            {
              validationErrors.nickname.length > 0 && validationErrors.nickname.map(error => (
                <span id="join-workspace_nickname-validation-errors" className="validation_errors">
                  <i className="fa-solid fa-circle-exclamation" />
                  {error}
                </span>
              ))
            }
          </div>
          <h3>Your profile photo <span> (optional)</span></h3>
          <div id="join-workspace_profile-image-upload">
            <div>
              <AvatarEditor
                ref={profileImageRef}
                // Create the dummy query string to force the image to reload
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
                id="join-workspace_profile-image-slider"
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
                id="join-workspace_profile-image-upload_button"
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
              <span id="join-workspace_image-server-errors" className="validation_errors">
                <i className="fa-solid fa-circle-exclamation" />
                {error}
              </span>
            ))
          }
          {
            serverErrors.other.length > 0 && serverErrors.other.map(error => (
              <span id="join-workspace_other-server-errors" className="validation_errors">
                <i className="fa-solid fa-circle-exclamation" />
                {error}
              </span>
            ))
          }
        </div>
        <button
          onClick={handleSubmit}
          disabled={Object.values(validationErrors).flat().length || !nicknameEdited}
        >
          Join Workspace
        </button>
      </form>

    </div>
  )
}
