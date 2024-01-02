import React, { useEffect, useState, useRef, useContext } from "react";
import { useDispatch, useSelector, ReactReduxContext } from "react-redux";
import { useThread } from "../../context/ThreadContext"
import parse from "html-react-parser";
import { CKEditor } from '@ckeditor/ckeditor5-react';
import Editor from 'ckeditor5-custom-build/build/ckeditor';
import EmojiPicker from 'emoji-picker-react';
import * as messageActions from "../../store/messages"
import "./Thread.css"

export function Reply() {
  const dispatch = useDispatch()
  const { store } = useContext(ReactReduxContext)
  const { messageId } = useThread()
  const sessionUser = useSelector(state => state.session.user)
  const activeWorkspaceId = sessionUser.activeWorkspaceId
  const workspaces = useSelector(state => state.workspaces.workspaceList)
  const activeWorkspace = activeWorkspaceId ? workspaces[activeWorkspaceId] : null
  const activeChannelId = activeWorkspace ? activeWorkspace.activeChannelId : null
  const channels = useSelector(state => state.channels.channelList)
  const activeChannel = activeChannelId ? channels[activeChannelId] : null
  const messages = useSelector(state => state.messages.messageList)
  const message = messageId ? messages[messageId] : null
  const replies = message ? Object.values(message.replies) : null
  const users = useSelector(state => state.users)
  const workspaceUsers = activeWorkspaceId ? users[activeWorkspaceId] : null
  const [showEditor, setShowEditor] = useState(false)
  const [editorId, setEditorId] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [dropdownId, setDropdownId] = useState(null)
  const [updatedReply, setUpdatedReply] = useState("")
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
    const data = await dispatch(messageActions.editReply(id, updatedReply))
    if (!data) {
      setShowEditor(false)
      setEditorId(null)
      setUpdatedReply("")
    }
  }

  const scrollToReply = async (replyId) => {
    const reply = document.querySelector(`#thread_reply-${replyId}`);
    if (reply) {
      reply.scrollIntoView({
        behavior: "smooth",
        block: 'center'
      });
    }
  }

  useEffect(() => {
    const closeDropdown = (e) => {
      if (
        ulRef.current[dropdownId]
        && buttonRef.current[dropdownId]
        && !ulRef.current[dropdownId].contains(e.target)
        && !buttonRef.current[dropdownId].contains(e.target)
      ) {
        setShowDropdown(false)
        setDropdownId(null)
      }
    }

    document.addEventListener("click", closeDropdown)
    return (() => {
      document.removeEventListener("click", closeDropdown)
    })
  }, [dropdownId, ulRef, buttonRef, replies])

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
  }, [emojiRef, emojiButtonRef, editorId, replies])

  useEffect(() => {
    setEditorReady(false)
  }, [editorId])

  useEffect(() => {
    if (showEditor) {
      scrollToReply(editorId)
    }
  }, [editorId, showEditor])

  return (
    <div id="thread_replies">
      {
        replies.map(reply => (
          <div
            key={reply.id}
            className={`thread_reply${showBackgroundColor && editorId === reply.id ? " reply_colored" : ""}`}
            id={`thread_reply-${reply.id}`}
          >
            <img
              src={workspaceUsers[reply.senderId]?.profileImageUrl || "/images/profile_images/profile_images_1.png"}
              alt="profile_image"
            />
            <div className={showEditor && editorId === reply.id ? "hidden" : ""}>
              <span className="thread_reply-sender">
                {workspaceUsers[reply.senderId]?.nickname || reply.senderEmail + " (not in workspace)"}
              </span>
              <span>
                {new Date(reply.createdAt).toLocaleString()}
              </span>
            </div>
            {
              showEditor && editorId === reply.id ?
                <>
                  <div
                    className={`${focused ? "focused" : ""}`}
                    id="reply_editor"
                  >
                    <CKEditor
                      editor={Editor}
                      data={updatedReply}
                      config={{
                        placeholder: "Edit reply",
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
                        const button = document.querySelector(`#thread_reply-${reply.id} .ck-splitbutton__arrow`)
                        if (button) {
                          button.addEventListener("mousedown", () => {
                            const toolbar = document.querySelector(`#thread_reply-${reply.id} .ck-toolbar`)
                            const dropdown = document.querySelector(`#thread_reply-${reply.id} .ck-dropdown__panel`)
                            const distanceToBottom = window.innerHeight - toolbar.getBoundingClientRect().bottom - 20
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
                        setUpdatedReply(editor.getData())
                      }}
                      onFocus={() => {
                        setFocused(true)
                      }}
                      onBlur={() => setFocused(false)}
                    />
                    <div id="reply_buttons">
                      <button
                        id="reply_textarea-format"
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
                        id="reply_textarea-emoji"
                        onClick={() => {
                          setShowEmojiPicker((prev) => !prev)
                          // Adjust the height and position of the emoji picker based on the distance between the toolbar
                          // and the window boundary
                          const picker = document.querySelector(`#thread_reply-${reply.id} .EmojiPickerReact`)
                          const distanceToBottom = window.innerHeight - emojiButtonRef.current[reply.id].getBoundingClientRect().bottom - 40
                          const distanceToTop = emojiButtonRef.current[reply.id].getBoundingClientRect().top - 180
                          const pickerHeight = Math.min(Math.max(distanceToBottom, distanceToTop), 400)
                          picker.style.height = `${pickerHeight}px`
                          if (distanceToTop < pickerHeight && distanceToTop < distanceToBottom) {
                            picker.style.bottom = `-${pickerHeight + 10}px`
                          } else {
                            picker.style.bottom = "80px"
                          }
                        }}
                        ref={el => emojiButtonRef.current[reply.id] = el}
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
                        id="reply_textarea-mention"
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
                        id="reply_textarea-cancel"
                        onClick={() => {
                          setShowEditor(false)
                          setEditorId(null)
                          setUpdatedReply(null)
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        id="reply_textarea-submit"
                        ref={submitRef}
                        disabled={!updatedReply}
                        onClick={(e) => handleSubmit(e, reply.id)}
                      >
                        Save
                      </button>
                    </div>
                    {
                      editorId === reply.id && editorReady &&
                      <div
                        id="reply_emoji-picker"
                        ref={el => emojiRef.current[reply.id] = el}
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
                  <span id="reply_instruction">
                    <b>Ctrl + Enter</b> to save change
                  </span>
                </> :
                <span>
                  {parse(reply.content)}
                  <span className="thread_reply-edited">
                    {reply.createdAt !== reply.updatedAt && "(edited)"}
                  </span>
                </span>
            }
            {
              reply.senderId === sessionUser.id &&
              <button
                className={`reply_dropdown ${showEditor && editorId === reply.id ? "hidden" : ""}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (showDropdown && dropdownId !== reply.id) {
                    setShowDropdown(false)
                  }
                  setShowDropdown((prev) => !prev)
                  setDropdownId(reply.id)
                  setShowEmojiPicker(false)
                }}
                ref={el => buttonRef.current[reply.id] = el}
              >
                {
                  showDropdown && dropdownId === reply.id ?
                    <i className="fa-solid fa-square-minus" /> :
                    <i className="fa-solid fa-square-plus" />
                }
              </button>
            }
            <ul
              className={`reply_dropdown-content${showDropdown && dropdownId === reply.id ? "" : " hidden"}`}
              ref={el => ulRef.current[reply.id] = el}
            >
              {
                reply.senderId === sessionUser.id &&
                <>
                  <li>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        setShowEditor(true)
                        setEditorId(reply.id)
                        setShowDropdown(false)
                        setUpdatedReply(reply.content)
                        setShowBackgroundColor(true)
                        setTimeout(() => {
                          setShowBackgroundColor(false)
                        }, 2000)
                      }}
                      id="reply_dropdown-edit"
                    >
                      <i className="fa-solid fa-pen-to-square" />
                      <span className="reply_dropdown-button-name">
                        Edit Reply
                      </span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        const data = await dispatch(messageActions.removeReply(reply.id))
                        if (!data) {
                          setShowDropdown(false)
                        }
                      }}
                      id="reply_dropdown-delete"
                    >
                      <i className="fa-solid fa-trash-can" />
                      <span className="reply_dropdown-button-name">
                        Delete Reply
                      </span>
                    </button>
                  </li>
                </>
              }
            </ul>
          </div>
        ))
      }
    </div >
  )
}
