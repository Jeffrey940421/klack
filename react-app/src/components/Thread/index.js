import React, { useEffect, useState, useRef, useContext } from "react";
import { useDispatch, useSelector, ReactReduxContext } from "react-redux";
import { useThread } from "../../context/ThreadContext"
import { Reply } from "./Reply";
import parse from "html-react-parser";
import { CKEditor } from '@ckeditor/ckeditor5-react';
import Editor from 'ckeditor5-custom-build/build/ckeditor';
import EmojiPicker from 'emoji-picker-react';
import * as messageActions from "../../store/messages"
import "./Thread.css"

export function Thread() {
  const dispatch = useDispatch()
  const { store } = useContext(ReactReduxContext)
  const { showThread, setShowThread, messageId } = useThread()
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
  const [newReply, setNewReply] = useState("")
  const [focused, setFocused] = useState(false)
  const [editor, setEditor] = useState(null)
  const [showFormat, setShowFormat] = useState(true)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiButtonRef = useRef(null)
  const emojiRef = useRef(null)
  const submitRef = useRef(null)
  const bottomRef = useRef(null)

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

  const extractContent = (str) => {
    const span = document.createElement('span');
    span.innerHTML = str;
    return span.textContent || span.innerText;
  };

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

  const handleSubmit = async (e) => {
    const data = await dispatch(messageActions.createReply(messageId, newReply))
    if (!Array.isArray(data)) {
      setNewReply("")
      bottomRef.current.scrollIntoView({
        behavior: "smooth"
      })
    }
  }

  const handleEnter = async (e, data, editor) => {
    const keyCode = data.which || data.keyCode;
    if (keyCode === 13 && data.ctrlKey) {
      data.preventDefault()
      submitRef && submitRef.current.click()
    }
  }

  useEffect(() => {
    const closeEmojiPicker = (e) => {
      if (emojiRef.current && emojiButtonRef.current && !emojiRef.current.contains(e.target) && !emojiButtonRef.current.contains(e.target)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener("click", closeEmojiPicker)
    return (() => {
      document.removeEventListener("click", closeEmojiPicker)
    })
  }, [])

  useEffect(() => {
    setNewReply("")
    setFocused(false)
    setShowFormat(true)
    setShowEmojiPicker(false)
    setEditor(null)
  }, [messageId])

  useEffect(() => {
    setNewReply("")
    setFocused(false)
    setShowFormat(true)
    setShowEmojiPicker(false)
    setEditor(null)
    setShowThread(false)
  }, [activeChannelId, activeWorkspaceId])

  if (!message) {
    setShowThread(false)
    return null
  }

  return (
    <div id="thread_container">
      <div id="thread_header">
        <div id="thread_title">
          <h3>Thread</h3>
          <span>
            <i className="fa-solid fa-hashtag" />
            {activeChannel.name}
          </span>
        </div>
        <div
          id="thread_close"
          onClick={() => setShowThread(false)}
        >
          <i className="fa-solid fa-xmark" />
        </div>
      </div>
      <hr></hr>
      <div id="thread_body">
        <div id="thread_message">
          <img
            src={workspaceUsers[message.senderId]?.profileImageUrl || "/images/profile_images/profile_images_1.png"}
            alt="profile_image"
          />
          <div>
            <span className="message_sender">
              {workspaceUsers[message.senderId]?.nickname || message.senderEmail + " (not in workspace)"}
            </span>
            <span>
              {new Date(message.createdAt).toLocaleString()}
            </span>
          </div>
          <span>
            {parse(message.content)}
            <span className="message_edited">
              {message.createdAt !== message.updatedAt && "(edited)"}
            </span>
          </span>
        </div>
        {
          replies.length > 0 &&
          <>
            <div id="thread_body-divider">
              <span>
                {replies.length}
                {replies.length === 1 ? " reply" : " replies"}
              </span>
              <hr></hr>
            </div>
            <Reply />
            <div ref={bottomRef}></div>
          </>
        }
        <div id="thread_reply-textarea" className={focused ? "focused" : ""} key={message.id}>
          <CKEditor
            editor={Editor}
            data={newReply}
            config={{
              placeholder: "Reply...",
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
              setEditor(editor)
              const button = document.querySelector(`#thread_reply-textarea .ck-splitbutton__arrow`)
              if (button) {
                button.addEventListener("mousedown", () => {
                  const toolbar = document.querySelector(`#thread_reply-textarea .ck-toolbar`)
                  const dropdown = document.querySelector(`#thread_reply-textarea .ck-dropdown__panel`)
                  const distanceToTop = toolbar.getBoundingClientRect().top - 120;
                  const distanceToBottom = window.innerHeight - toolbar.getBoundingClientRect().bottom - 40;
                  const dropdownHeight = Math.min(Math.max(distanceToBottom, distanceToTop), 200)
                  if (dropdown) {
                    dropdown.style.maxHeight = `${dropdownHeight}px`
                    if (distanceToTop < dropdownHeight && distanceToBottom > distanceToTop) {
                      dropdown.style.top = "100%"
                      dropdown.style.bottom = "auto"
                    } else {
                      dropdown.style.top = "auto"
                      dropdown.style.bottom = "100%"
                    }
                  }
                })
              }

              editor.editing.view.document.on('keydown', (e, data) => handleEnter(e, data, editor))
            }}
            onChange={(e, editor) => {
              setNewReply(editor.getData())
            }}
            onFocus={() => {
              setFocused(true)
            }}
            onBlur={() => setFocused(false)}
          />
          <div id="thread_buttons">
            <button
              id="thread_textarea-format"
              onClick={() => {
                const toolbar = editor.ui.view.toolbar.element;
                toolbar.style.display = toolbar.style.display === 'none' ? 'flex' : 'none';
                setShowFormat((prev) => !prev)
              }}
              className={showFormat ? 'show-format' : 'hide-format'}
            >
              <img src="/format.svg" alt="format" />
            </button>
            <button
              id="thread_textarea-emoji"
              onClick={async (e) => {
                e.stopPropagation()
                setShowEmojiPicker((prev) => !prev)
                // Adjust the height and position of the emoji picker based on the distance between the toolbar
                // and the window boundary
                const picker = document.querySelector(`#thread_reply-textarea .EmojiPickerReact`)
                const distanceToBottom = window.innerHeight - emojiButtonRef.current.getBoundingClientRect().bottom - 40
                const distanceToTop = emojiButtonRef.current.getBoundingClientRect().top - 170
                const pickerHeight = Math.min(Math.max(distanceToBottom, distanceToTop), 400)
                if (picker) {
                  picker.style.height = `${pickerHeight}px`
                  if (distanceToTop < pickerHeight && distanceToTop < distanceToBottom) {
                    picker.style.bottom = `-${pickerHeight + 10}px`
                  } else {
                    picker.style.bottom = "80px"
                  }
                }
              }}
              ref={emojiButtonRef}
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
              id="thread_textarea-mention"
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
            <span id="thread_instruction">
              <b>Ctrl + Enter</b> to send message
            </span>
            <button
              id="thread_textarea-submit"
              ref={submitRef}
              disabled={!newReply}
              onClick={handleSubmit}
            >
              <i className="fa-solid fa-paper-plane" /> Send
            </button>
          </div>
          {
            editor &&
            <div
              id="thread_emoji-picker"
              ref={emojiRef}
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
      </div>
    </div>
  )
}
