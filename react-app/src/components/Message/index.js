import { useModal } from "../../context/Modal"
import React, { useEffect, useState, useRef, useContext } from "react";
import { useDispatch, useSelector, ReactReduxContext } from "react-redux";
import * as messagesActions from "../../store/messages"
import * as channelActions from "../../store/channels"
import { ScrollContainer } from "../ScrollContainer";
import { JoinChannel } from "../JoinChannel";
import parse from "html-react-parser";
import { CKEditor } from '@ckeditor/ckeditor5-react';
import Editor from 'ckeditor5-custom-build/build/ckeditor';
import EmojiPicker from 'emoji-picker-react';
import { useThread } from "../../context/ThreadContext";
import mime from "./mime.json";
import { saveAs } from 'file-saver'
import "./Message.css"


export function Message({ channel, editorHeight, setEditorHeight, editorObj }) {
  const dispatch = useDispatch()
  const { store } = useContext(ReactReduxContext)
  const { setModalContent } = useModal()
  const { setMessageId, setShowThread } = useThread()
  const sessionUser = useSelector((state) => state.session.user)
  const activeWorkspaceId = sessionUser.activeWorkspaceId
  const messages = useSelector((state) => state.messages.messageList)
  const channelMessageIds = useSelector((state) => state.messages.organizedMessages[channel.id])
  const channelMessages = channelMessageIds ? channelMessageIds.map(id => messages[id]).reverse() : []
  const users = useSelector((state) => state.users)
  const workspaceUsers = users[channel.workspaceId]
  const channelCreator = workspaceUsers[channel.creatorId]
  const [showEditor, setShowEditor] = useState(false)
  const [showReaction, setShowReaction] = useState(false)
  const [editorId, setEditorId] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [dropdownId, setDropdownId] = useState(null)
  const [updatedMessage, setUpdatedMessage] = useState("")
  const [editor, setEditor] = useState(null)
  const [editorReady, setEditorReady] = useState(false)
  const [focused, setFocused] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showFormat, setShowFormat] = useState(true)
  const [showBackgroundColor, setShowBackgroundColor] = useState(false)
  const emojiButtonRef = useRef({})
  const emojiRef = useRef({})
  const submitRef = useRef(null)
  const ulRef = useRef({})
  const buttonRef = useRef({})
  const reactionRef = useRef({})
  const reactionButtonRef = useRef({})

  const downloadFile = async (e, url, fileName) => {
    e.stopPropagation()
    const response = await fetch(`${url}?${new Date()}`, {
      mode: 'cors',
      credentials: 'same-origin'
    })
    const blob = await response.blob()
    saveAs(blob, fileName)
  }

  const extractContent = (str) => {
    const span = document.createElement('span');
    span.innerHTML = str;
    return span.textContent || span.innerText;
  };

  const getFeedItems = async (queryText) => {
    const activeChannelId = store.getState().workspaces.workspaceList[activeWorkspaceId].activeChannelId
    const channelUserIds = store.getState().channels.channelList[activeChannelId].users
    const workspaceUsers = store.getState().users[activeWorkspaceId]
    const channelUsers = channelUserIds.map(id => workspaceUsers[id])
    channelUsers.unshift({
      nickname: "channel",
      userId: "channel",
      profileImageUrl: "/bullhorn-solid.svg",
      email: "Notify everyone in this channel",
    })
    const items = channelUsers
      .filter(userInfo => {
        return userInfo.nickname.toLowerCase().includes(queryText.toLowerCase())
          || userInfo.email.toLowerCase().includes(queryText.toLowerCase())
      })
      .map(user => {
        return {
          id: `@${user.nickname}`,
          userId: user.userId,
          name: user.nickname,
          profileImageUrl: user.profileImageUrl,
          email: user.email
        }
      })
    return items
  }

  const customItemRenderer = (item) => {
    const itemElement = document.createElement('span');
    itemElement.classList.add('mention-list-item');
    itemElement.id = `mention-list-item-${item.userId}`;

    const avatarElement = document.createElement('img');
    avatarElement.classList.add('mention-list-avatar');
    avatarElement.src = item.profileImageUrl;
    avatarElement.alt = item.name;

    const avatarWrapper = document.createElement('span');
    avatarWrapper.classList.add('mention-list-avatar-wrapper');
    avatarWrapper.appendChild(avatarElement);
    itemElement.appendChild(avatarWrapper);
    if (item.userId === "channel") {
      avatarWrapper.classList.add('mention-list-channel-icon');
    }

    const usernameElement = document.createElement('span');
    usernameElement.classList.add('mention-list-username');
    usernameElement.textContent = item.userId === "channel" ?
      "@channel" :
      item.userId === sessionUser.id ?
        `${item.name} (you)` :
        item.name;
    itemElement.appendChild(usernameElement);

    const emailElement = document.createElement('span');
    emailElement.classList.add('mention-list-email');
    emailElement.textContent = item.email;
    itemElement.appendChild(emailElement);

    return itemElement;
  }

  const handleEnter = async (e, data, editor) => {
    const keyCode = data.which || data.keyCode;
    if (keyCode === 13 && data.ctrlKey) {
      data.preventDefault()
      submitRef && submitRef.current.click()
    }
  }

  const handleSubmit = async (e, id) => {
    e.preventDefault()
    const data = await dispatch(messagesActions.editMessage(id, updatedMessage || "<p></p>"))
    if (!data) {
      setShowEditor(false)
      setEditorId(null)
      setUpdatedMessage("")
    }
  }

  useEffect(() => {
    const closeDropdown = (e) => {
      if (
        ulRef.current[dropdownId]
        && buttonRef.current[dropdownId]
        && !ulRef.current[dropdownId].contains(e.target)
        && !buttonRef.current[dropdownId].contains(e.target)
        && !showReaction
      ) {
        setShowDropdown(false)
        setDropdownId(null)
      }
    }

    document.addEventListener("click", closeDropdown)
    return (() => {
      document.removeEventListener("click", closeDropdown)
    })
  }, [dropdownId, ulRef, buttonRef, messages, showReaction])

  useEffect(() => {
    const closeEmojiPicker = (e) => {
      if (
        emojiRef.current[editorId]
        && emojiButtonRef.current[editorId]
        && !emojiRef.current[editorId].contains(e.target)
        && !emojiButtonRef.current[editorId].contains(e.target)
      ) {
        setShowEmojiPicker(false)
      }
    }

    document.addEventListener("click", closeEmojiPicker)
    return (() => {
      document.removeEventListener("click", closeEmojiPicker)
    })
  }, [emojiRef, emojiButtonRef, editorId, messages])

  useEffect(() => {
    setEditorReady(false)
  }, [editorId])

  useEffect(() => {
    const closeReaction = (e) => {
      if (
        reactionRef.current[dropdownId]
        && reactionButtonRef.current[dropdownId]
        && !reactionRef.current[dropdownId].contains(e.target)
        && !reactionButtonRef.current[dropdownId].contains(e.target)
      ) {
        setShowReaction(false)
      }
    }

    document.addEventListener("click", closeReaction)
    return (() => {
      document.removeEventListener("click", closeReaction)
    })
  }, [reactionRef, dropdownId, messages])

  useEffect(() => {
    setEditorReady(false)
  }, [editorId])

  return (
    <>
      <div id="message_container">
        <ScrollContainer editorHeight={editorHeight} setEditorHeight={setEditorHeight} editorObj={editorObj} editorId={editorId} showEditor={showEditor} >
          {
            channelMessages.length === channel.messageNum &&
            <div
              id="message_intro"
              style={{ borderColor: channelMessages.length ? "lightgray" : "transparent" }}
            >
              <h1>🥳 Welcome to the # {channel.name} channel</h1>
              <p>
                {
                  channel.description ?
                    channel.description :
                    `${channelCreator ? `@${channelCreator.nickname}` : `${channel.creatorEmail} (not in workspace)`} created this channel on ${new Date(channel.createdAt).toLocaleString('en-us', { year: 'numeric', month: 'long', day: '2-digit' })}. This is the very beginning of the #${channel.name} channel.`
                }
              </p>
              {
                channel.name !== "general" &&
                <button
                  onClick={() => setModalContent(<JoinChannel />)}
                >
                  <i className="fa-solid fa-user-plus" />
                  Add Coworkers
                </button>
              }
            </div>
          }
          {
            channelMessages.map(message => {
              return (
                <div
                  className={`message_message-body${message.systemMessage ? " message_system-message" : ""}${showBackgroundColor && message.id === editorId ? " message_colored" : ""}`}
                  id={`message_${message.id}`}
                  key={message.id}
                >
                  <img
                    src={workspaceUsers[message.senderId]?.profileImageUrl || "/images/profile_images/profile_images_1.png"}
                    alt="profile_image"
                  />
                  <div className={showEditor && editorId === message.id ? "hidden" : ""}>
                    <span className="message_sender">
                      {workspaceUsers[message.senderId]?.nickname || message.senderEmail + " (not in workspace)"}
                    </span>
                    <span>
                      {new Date(message.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {
                    showEditor && editorId === message.id ?
                      <>
                        <div
                          className={`${focused ? "focused" : ""}`}
                          id="message_editor"
                        >
                          <CKEditor
                            editor={Editor}
                            data={updatedMessage}
                            config={{
                              placeholder: "Edit message",
                              mention: {
                                dropdownLimit: 6,
                                feeds: [
                                  {
                                    marker: '@',
                                    feed: getFeedItems,
                                    itemRenderer: customItemRenderer
                                  }
                                ],
                              },
                            }}
                            onReady={(editor) => {
                              // Adjust the height and position of the dropdown panel based on the distance between the toolbar
                              // and the window boundary
                              const button = document.querySelector(`#message_${message.id} .ck-splitbutton__arrow`)
                              if (button) {
                                button.addEventListener("mousedown", () => {
                                  const toolbar = document.querySelector(`#message_${message.id} .ck-toolbar`)
                                  const dropdown = document.querySelector(`#message_${message.id} .ck-dropdown__panel`)
                                  const distanceToBottom = window.innerHeight - toolbar.getBoundingClientRect().bottom - 50
                                  const distanceToTop = toolbar.getBoundingClientRect().top - 120
                                  const dropdownHeight = Math.min(Math.max(distanceToBottom, distanceToTop), 200)
                                  dropdown.style.maxHeight = `${dropdownHeight}px`
                                  if (distanceToBottom < dropdownHeight && distanceToTop > distanceToBottom) {
                                    dropdown.style.bottom = "30px"
                                    dropdown.style.top = "auto"
                                  } else {
                                    dropdown.style.bottom = "auto"
                                    dropdown.style.top = "30px"
                                  }
                                })
                              }

                              editor.editing.view.document.on('keydown', (e, data) => handleEnter(e, data, editor))
                              setEditor(editor)
                              setEditorReady(true)
                            }}
                            onChange={(e, editor) => {
                              setUpdatedMessage(editor.getData())
                            }}
                            onFocus={() => {
                              setFocused(true)
                            }}
                            onBlur={() => setFocused(false)}
                          />
                          <div id="message_buttons">
                            <button
                              id="message_textarea-format"
                              onClick={() => {
                                const toolbar = editor.ui.view.toolbar.element
                                toolbar.style.display = toolbar.style.display === 'none' ? 'flex' : 'none';
                                setShowFormat((prev) => !prev)
                              }}
                              className={showFormat ? 'show-format' : 'hide-format'}
                            >
                              <img src="/format.svg" alt="format" />
                            </button>
                            <button
                              id="message_textarea-emoji"
                              onClick={() => {
                                setShowEmojiPicker((prev) => !prev)
                                // Adjust the height and position of the emoji picker based on the distance between the toolbar
                                // and the window boundary
                                const picker = document.querySelector(`#message_${message.id} #message_emoji-picker .EmojiPickerReact`)
                                const distanceToBottom = window.innerHeight - emojiButtonRef.current[message.id].getBoundingClientRect().bottom - 50
                                const distanceToTop = emojiButtonRef.current[message.id].getBoundingClientRect().top - 180
                                const pickerHeight = Math.min(Math.max(distanceToBottom, distanceToTop), 400)
                                picker.style.height = `${pickerHeight}px`
                                if (distanceToTop < pickerHeight && distanceToTop < distanceToBottom) {
                                  picker.style.bottom = `-${pickerHeight + 10}px`
                                } else {
                                  picker.style.bottom = "80px"
                                }
                              }}
                              ref={el => emojiButtonRef.current[message.id] = el}
                            >
                              {
                                showEmojiPicker ?
                                  <i
                                    className="fa-solid fa-face-grin-tongue-squint"
                                    style={{ color: "#f2d202" }} /> :
                                  <i className="fa-regular fa-face-smile" />
                              }
                            </button>
                            <button
                              id="message_textarea-mention"
                              onClick={async () => {
                                editor.model.change(writer => {
                                  const insertPosition = editor.model.document.selection.getFirstPosition();
                                  const data = editor.getData();
                                  const content = extractContent(data);
                                  if (!data || content.endsWith(" ")) {
                                    writer.insertText("@", insertPosition);
                                  } else {
                                    writer.insertText(" @", insertPosition);
                                  }
                                  editor.editing.view.focus();
                                  const latestSelection = editor.model.document.selection.getFirstPosition();
                                  writer.setSelection(latestSelection);
                                })
                              }}
                            >
                              <img src="/mention.svg" alt="format" />
                            </button>
                            <button
                              id="message_textarea-cancel"
                              onClick={() => {
                                setShowEditor(false)
                                setEditorId(null)
                                setUpdatedMessage(null)
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              id="message_textarea-submit"
                              ref={submitRef}
                              disabled={!updatedMessage && message.attachments.length === 0}
                              onClick={(e) => handleSubmit(e, message.id)}
                            >
                              Save
                            </button>
                          </div>
                          {
                            editorId === message.id && editorReady &&
                            <div
                              id="message_emoji-picker"
                              ref={el => emojiRef.current[message.id] = el}
                              className={showEmojiPicker ? "" : "hidden"}
                            >
                              <EmojiPicker
                                emojiStyle="native"
                                autoFocusSearch={false}
                                onEmojiClick={(emojiObject) => {
                                  editor.model.change(writer => {
                                    const insertPosition = editor.model.document.selection.getFirstPosition();
                                    writer.insertText(emojiObject.emoji, insertPosition);
                                    editor.editing.view.focus();
                                    const latestSelection = editor.model.document.selection.getLastPosition();
                                    writer.setSelection(latestSelection);
                                  });
                                  setShowEmojiPicker(false)
                                }}
                                searchDisabled={true}
                              />
                            </div>
                          }
                        </div>
                        <span id="message_instruction">
                          <b>Ctrl + Enter</b> to save change
                        </span>
                      </> :
                      <span>
                        {
                          message.content !== "<p></p>" &&
                          parse(message.content)
                        }
                        <span className="message_edited">
                          {message.createdAt !== message.updatedAt && "(edited)"}
                        </span>
                        {
                          message.attachments.length > 0 &&
                          <div id="message_attachment-preview">
                            {
                              message.attachments.map((url, i) => {
                                const urlSegements = url.split("/")
                                const fileName = urlSegements[urlSegements.length - 1]
                                const originalFileName = fileName.split("-", 1)
                                const fileNameSegements = fileName.split(".")
                                const fileExtension = fileNameSegements[fileNameSegements.length - 1]
                                const fullType = mime[fileExtension]
                                const type = fullType ? fullType.split("/")[0] : "other"
                                if (type === "image") {
                                  return (
                                    <div
                                      className="message_image-attachment"
                                      key={i}
                                      onClick={() => {
                                        setModalContent(
                                          <div id="message_image-modal">
                                            <img src={url} alt="attachment" />
                                          </div>
                                        )
                                      }}
                                    >
                                      <img
                                        src={url}
                                        alt="attachment"
                                      />
                                      <span className="message_attachment-name">{originalFileName}</span>
                                      <span className="message_attachment-type">{type[0].toUpperCase() + type.slice(1).toLowerCase()}</span>
                                      <span className="message-attachment-buttons">
                                        <button
                                          onClick={(e) => downloadFile(e, url, originalFileName)}
                                        >
                                          <i class="fa-solid fa-cloud-arrow-down" />
                                        </button>
                                      </span>
                                    </div>
                                  )
                                } else if (type === "video") {
                                  return (
                                    <div
                                      className="message_video-attachment"
                                      key={i}
                                      onClick={() => {
                                        setModalContent(
                                          <div id="message_video-modal">
                                            <video src={url} controls />
                                          </div>
                                        )
                                      }}
                                    >
                                      <video
                                        src={url}
                                        alt="attachment"
                                      />
                                      <span
                                        className="message_attachment-play"
                                        onClick={() => {
                                          setModalContent(
                                            <div id="message_video-modal">
                                              <video src={url} controls />
                                            </div>
                                          )
                                        }}
                                      >
                                        <i className="fa-solid fa-play" />
                                      </span>
                                      <span className="message_attachment-name">{originalFileName}</span>
                                      <span className="message_attachment-type">{type[0].toUpperCase() + type.slice(1).toLowerCase()}</span>
                                      <span className="message-attachment-buttons">
                                        <button
                                          onClick={(e) => downloadFile(e, url, originalFileName)}
                                        >
                                          <i class="fa-solid fa-cloud-arrow-down" />
                                        </button>
                                      </span>
                                    </div>
                                  )
                                } else {
                                  return (
                                    <div
                                      className="message_file-attachment"
                                      key={i}
                                      onClick={(e) => downloadFile(e, url, originalFileName)}
                                    >
                                      <div className="message_file-background">
                                        <i className="fa-solid fa-file" />
                                      </div>
                                      <span className="message_attachment-name">{originalFileName}</span>
                                      <span className="message_attachment-type">{type[0].toUpperCase() + type.slice(1).toLowerCase()}</span>
                                      <span className="message-attachment-buttons">
                                        <button
                                          onClick={(e) => downloadFile(e, url, originalFileName)}
                                        >
                                          <i class="fa-solid fa-cloud-arrow-down" />
                                        </button>
                                      </span>
                                    </div>
                                  )
                                }
                              })
                            }
                          </div>
                        }
                        {
                          Object.keys(message.reactions).length > 0 &&
                          <div className="message_reactions">
                            {
                              Object.keys(message.reactions).map((reactionCode, i) => {
                                const reactionSkins = Object.keys(message.reactions[reactionCode])
                                const userReactions = Object.values(message.reactions[reactionCode]).flat().find((reaction => reaction.senderId === sessionUser.id))
                                return (
                                  <div
                                    className={`message_reaction-set${userReactions ? " message_reaction-sent" : ""}`}
                                    key={i}
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      if (!userReactions) {
                                        const reaction = { reactionCode, reactionSkin: "neutral" }
                                        await dispatch(messagesActions.createReaction(message.id, reaction))
                                      } else {
                                        await dispatch(messagesActions.removeReaction(userReactions.id, message.id, reactionCode, userReactions.reactionSkin))
                                      }
                                    }}
                                  >
                                    {
                                      reactionSkins.map((reactionSkin, j) => {
                                        const reactionCodeSegements = reactionCode.split("-")
                                        if (reactionSkin !== "neutral") {
                                          reactionCodeSegements.splice(1, 0, reactionSkin)
                                        }
                                        const emoji = `&#x${reactionCodeSegements.join(";&#x")}`
                                        return (
                                          <span
                                            className="message_reaction"
                                            key={`${i}-${j}`}
                                          >
                                            {parse(emoji)}
                                          </span>
                                        )
                                      })
                                    }
                                    <span className="message_reaction-count">
                                      {Object.values(message.reactions[reactionCode]).flat().length}
                                    </span>
                                  </div>
                                )
                              })
                            }
                          </div>
                        }
                      </span>
                  }
                  {
                    Object.values(message.replies).length > 0 &&
                    <>
                      <div></div>
                      <div
                        className={`message_thread${showEditor && editorId === message.id ? " hidden" : ""}`}
                        onClick={() => {
                          setMessageId(message.id)
                          setShowThread(true)
                        }}
                      >
                        <img
                          src={workspaceUsers[message.replies[Object.keys(message.replies)[0]].senderId]?.profileImageUrl || "/images/profile_images/profile_images_1.png"}
                          alt="profile_image"
                        />
                        <span>
                          {Object.values(message.replies).length}
                          {Object.values(message.replies).length === 1 ? " reply" : " replies"}
                        </span>
                      </div>
                    </>
                  }
                  <button
                    className={`message_dropdown ${message.systemMessage || (showEditor && editorId === message.id) ? "hidden" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (showDropdown && dropdownId !== message.id) {
                        setShowDropdown(false)
                      }
                      setShowDropdown((prev) => !prev)
                      setDropdownId(message.id)
                      setShowEmojiPicker(false)
                      setShowReaction(false)
                    }}
                    ref={el => buttonRef.current[message.id] = el}
                  >
                    {
                      showDropdown && dropdownId === message.id ?
                        <i className="fa-solid fa-square-minus" /> :
                        <i className="fa-solid fa-square-plus" />
                    }
                  </button>
                  <ul
                    className={`message_dropdown-content${showDropdown && dropdownId === message.id ? "" : " hidden"}`}
                    ref={el => ulRef.current[message.id] = el}
                  >
                    {
                      message.senderId === sessionUser.id &&
                      <>
                        <li>
                          <button
                            onClick={async (e) => {
                              setShowEditor(true)
                              setEditorId(message.id)
                              setShowDropdown(false)
                              setUpdatedMessage(message.content)
                              setShowBackgroundColor(true)
                              // Highlight the message
                              setTimeout(() => {
                                setShowBackgroundColor(false)
                              }, 2000)
                            }}
                            id="message_dropdown-edit"
                          >
                            <i className="fa-solid fa-pen-to-square" />
                            <span className="message_dropdown-button-name">
                              Edit Message
                            </span>
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={async (e) => {
                              const data = await dispatch(messagesActions.removeMessage(message.id))
                              if (!Array.isArray(data)) {
                                const channel = data.channel
                                await dispatch(channelActions.addChannel(channel))
                                setShowDropdown(false)
                              }
                            }}
                            id="message_dropdown-delete"
                          >
                            <i className="fa-solid fa-trash-can" />
                            <span className="message_dropdown-button-name">
                              Delete Message
                            </span>
                          </button>
                        </li>
                      </>
                    }
                    <li>
                      <button
                        onClick={() => {
                          setMessageId(message.id)
                          setShowThread(true)
                          setShowDropdown(false)
                        }}
                      >
                        <i className="fa-solid fa-comment-dots" />
                        <span className="message_dropdown-button-name">
                          Send Replies
                        </span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          const pickerParent = document.querySelector(`#message_${message.id} .message_reaction-picker`)
                          const picker = document.querySelector(`#message_${message.id} .message_reaction-picker .EmojiPickerReact`)
                          const distanceToBottom = window.innerHeight - reactionButtonRef.current[message.id].getBoundingClientRect().bottom - 50
                          const distanceToTop = reactionButtonRef.current[message.id].getBoundingClientRect().top - 150
                          const pickerHeight = Math.min(Math.max(distanceToBottom, distanceToTop), 400)
                          picker.style.height = `${pickerHeight}px`
                          if (distanceToTop >= pickerHeight && distanceToTop > distanceToBottom) {
                            pickerParent.style.top = `-${pickerHeight + 10}px`
                          } else {
                            pickerParent.style.top = "35px"
                          }
                          setShowReaction(prev => !prev)
                        }}
                        ref={el => reactionButtonRef.current[message.id] = el}
                      >
                        <i className="fa-solid fa-face-smile" />
                        <span className="message_dropdown-button-name">
                          Add Reactions
                        </span>
                      </button>
                    </li>
                  </ul>
                  {
                    dropdownId === message.id &&
                    <div
                      ref={el => reactionRef.current[message.id] = el}
                      className={`message_reaction-picker${showReaction ? "" : " hidden"}`}
                    >
                      <EmojiPicker
                        emojiStyle="native"
                        autoFocusSearch={false}
                        onEmojiClick={async (emojiObject) => {
                          const fullReactionCode = emojiObject.unified
                          const reactionCode = emojiObject.unifiedWithoutSkinTone
                          const reactionSkin = fullReactionCode.split("-").find((code) => !reactionCode.split("-").includes(code)) || "neutral"
                          if (message.reactions[reactionCode]) {
                            const reaction = Object.values(message.reactions[reactionCode]).flat().find((reaction) => reaction.senderId === sessionUser.id)
                            if (reaction) {
                              await dispatch(messagesActions.removeReaction(reaction.id, message.id, reactionCode, reaction.reactionSkin))
                            } else {
                              const reaction = { reactionCode, reactionSkin }
                              await dispatch(messagesActions.createReaction(message.id, reaction))
                            }
                          } else {
                            const reaction = { reactionCode, reactionSkin }
                            await dispatch(messagesActions.createReaction(message.id, reaction))
                          }
                          setShowReaction(false)
                        }}
                        searchDisabled={true}
                      />
                    </div>
                  }
                </div>
              )
            })
          }
        </ScrollContainer>
      </div>
    </>
  )
}
