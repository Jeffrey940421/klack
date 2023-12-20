import { useModal } from "../../context/Modal"
import React, { useEffect, useState, useRef, useContext } from "react";
import { useDispatch, useSelector, ReactReduxContext } from "react-redux";
import { CreateChannel } from "../CreateChannel";
import { ChannelDetails } from "../ChannelDetails";
import { JoinChannel } from "../JoinChannel";
import { Message } from "../Message";
import * as channelActions from "../../store/channels"
import * as workspaceActions from "../../store/workspaces"
import * as messageActions from "../../store/messages"
import { CKEditor } from '@ckeditor/ckeditor5-react';
import Editor from 'ckeditor5-custom-build/build/ckeditor';
import EmojiPicker from 'emoji-picker-react';
import { Thread } from "../Thread";
import { useSpring, animated } from "react-spring";
import { useThread } from "../../context/ThreadContext";

export function ChannelWindow() {
  const dispatch = useDispatch()
  const { setModalContent } = useModal();
  const { showThread, setShowThread } = useThread()
  const { store } = useContext(ReactReduxContext)
  const sessionUser = useSelector((state) => state.session.user);
  const activeWorkspaceId = sessionUser.activeWorkspaceId;
  const workspaces = useSelector((state) => state.workspaces.workspaceList);
  const activeWorkspace = workspaces[activeWorkspaceId];
  const channels = useSelector((state) => state.channels.channelList);
  const activeChannelId = activeWorkspace.activeChannelId;
  const activeChannel = channels[activeChannelId];
  const users = useSelector((state) => state.users);
  const workspaceUsers = users[activeWorkspaceId];
  const channelUsers = activeChannel.users.map((userId) => workspaceUsers[userId]);
  const channelCreator = workspaceUsers[activeChannel.creatorId];
  const channelCreatorId = activeChannel.creatorId;
  const [showChannelMenu, setShowChannelMenu] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [focused, setFocused] = useState(false)
  const [editorHeight, setEditorHeight] = useState(108);
  const [editor, setEditor] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFormat, setShowFormat] = useState(true)
  const ulRef = useRef();
  const submitRef = useRef()
  const emojiRef = useRef()
  const emojiButtonRef = useRef()
  const backgroundRef = useRef()

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

  const openChannelMenu = () => {
    setShowChannelMenu((prev) => !prev);
  };

  const deleteChannel = async () => {
    setShowChannelMenu(false)
    const data = await dispatch(channelActions.removeChannel(activeChannel))
    if (!Array.isArray(data)) {
      const workspace = data.workspace
      await dispatch(workspaceActions.addWorkspace(workspace))
      await dispatch(messageActions.deleteChannelMessages(activeChannelId))
    }
  }

  const leaveChannel = async () => {
    setShowChannelMenu(false)
    const data = await dispatch(channelActions.leaveChannel(activeChannel))
    if (!Array.isArray(data)) {
      const workspace = data.workspace
      await dispatch(workspaceActions.addWorkspace(workspace))
      await dispatch(messageActions.deleteChannelMessages(activeChannelId))
    }
  }

  const handleSubmit = async (e) => {
    const data = await dispatch(messageActions.createMessage(activeChannelId, newMessage))
    if (!Array.isArray(data)) {
      const channel = data.channel
      await dispatch(channelActions.addChannel(channel))
      setNewMessage("")
      // e.target.parentNode.dataset.replicatedValue = ""
    }
  }

  const handleEnter = async (e, data, editor) => {
    const keyCode = data.which || data.keyCode;
    if (keyCode === 13 && data.ctrlKey) {
      data.preventDefault()
      submitRef && submitRef.current.click()
    }

    // Replaced the with the new shortcut
    // if (keyCode === 13 && !data.shiftKey) {
    //   data.preventDefault()
    //   submitRef && submitRef.current.click()
    // }

    // if (data.shiftKey && keyCode === 13) {
    //   data.preventDefault();
    //   editor.execute('enter');
    // };
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
    if (!showChannelMenu) return;

    const closeChannelMenu = (e) => {
      if (ulRef.current && !ulRef.current.contains(e.target)) {
        setShowChannelMenu(false);
      }
    };

    document.addEventListener("click", closeChannelMenu);

    return () => document.removeEventListener("click", closeChannelMenu);
  }, [showChannelMenu]);

  useEffect(() => {
    backgroundRef.current.style.height = `${editorHeight - 108 + 165}px`;
  }, [editorHeight])

  const backgroundProps = useSpring({
    width: showThread ? "60%" : "100%",
    config: {
      duration: 200
    }
  })

  const ThreadProps = useSpring({
    right: showThread ? "0%" : "-40%",
    config: {
      duration: 200
    }
  })

  return (
    <div id="channel-window_container">
      <animated.div
        id="channel-window_background"
        className={showThread ? "shrink" : ""}
        style={backgroundProps}
      >
        <div id="channel-window_header">
          <div
            id="channel-window_title"
            onClick={openChannelMenu}
          >
            <i className="fa-solid fa-hashtag" />
            <h3>{activeChannel?.name}</h3>
            <i className="fa-solid fa-angle-down" />
          </div>
          <div
            id="channel-window_members"
            onClick={() => setModalContent(<ChannelDetails channel={activeChannel} defaultMenu="members" />)}
          >
            <img
              src={channelCreator ? channelCreator?.profileImageUrl : channelUsers[channelUsers.length - 1]?.profileImageUrl}
              alt="member"
            />
            <span>{activeChannel?.users.length}</span>
          </div>
          <ul
            id="channel-window_channel-dropdown"
            className={showChannelMenu ? "" : "hidden"}
            ref={ulRef}
          >
            {
              (sessionUser.id === channelCreatorId || workspaceUsers[sessionUser.id].role === "admin") &&
              <li
                onClick={() => {
                  setModalContent(<CreateChannel type="edit" channel={activeChannel} workspace={activeWorkspace} />)
                  setShowChannelMenu(false)
                }}
              >
                Edit Channel
              </li>
            }
            {
              activeChannel?.name !== "general" &&
              <li
                onClick={() => {
                  setModalContent(<JoinChannel />)
                  setShowChannelMenu(false)
                }}
              >
                Add People to Channel
              </li>
            }
            <li
              onClick={() => {
                setModalContent(<ChannelDetails channel={activeChannel} defaultMenu="about" />)
                setShowChannelMenu(false)
              }}
            >
              Channel Details
            </li>
            {
              // General channel cannot be left or deleted
              activeChannel?.name !== "general" ?
                <>
                  <hr></hr>
                  {
                    // Non channel creator can leave the channel
                    sessionUser.id !== channelCreatorId &&
                    <li
                      id="channel-window_leave-channel"
                      onClick={leaveChannel}
                    >
                      Leave Channel
                    </li>
                  }
                  {
                    // Channel creator or workspace admin can delete the channel
                    (sessionUser.id === channelCreatorId || workspaceUsers[sessionUser.id].role === "admin") &&
                    <li
                      id="channel-window_delete-channel"
                      onClick={deleteChannel}
                    >
                      Delete Channel
                    </li>
                  }
                </> :
                null
            }
          </ul>
        </div>
        <hr></hr>
        <div id="channel-window_body">
          <Message channel={activeChannel} editorHeight={editorHeight} />
        </div>
        <div id="channel-window_textarea" className={focused ? "focused" : ""}>
          {/* Replaced with CKEditor */}
          {/* <div>
            <textarea
              placeholder={`Message #${channel?.name}`}
              onInput={(e) => {
                e.stopPropagation()
                e.target.parentNode.dataset.replicatedValue = e.target.value
              }}
              onChange={(e) => setNewMessage(e.target.value)}
              value={newMessage}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={handleEnter}
            />
            <button
              ref={submitRef}
              disabled={!newMessage}
              onClick={handleSubmit}
            >
              <i className="fa-solid fa-paper-plane" /> Send
            </button>
          </div> */}
          <CKEditor
            editor={Editor}
            data={newMessage}
            config={{
              placeholder: `Message #${activeChannel?.name}`,
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
              const button = document.querySelector(`#channel-window_textarea .ck-splitbutton__arrow`)
              if (button) {
                button.addEventListener("mousedown", () => {
                  const toolbar = document.querySelector(`#channel-window_textarea .ck-toolbar`)
                  const dropdown = document.querySelector(`#channel-window_textarea .ck-dropdown__panel`)
                  const distanceToTop = toolbar.getBoundingClientRect().top - 70;
                  const distanceToBottom = window.innerHeight - toolbar.getBoundingClientRect().bottom - 40;
                  const dropdownHeight = Math.min(Math.max(distanceToBottom, distanceToTop), 200)
                  dropdown.style.maxHeight = `${dropdownHeight}px`
                  if (distanceToTop < dropdownHeight && distanceToBottom > distanceToTop) {
                    dropdown.style.top = "100%"
                    dropdown.style.bottom = "auto"
                  } else {
                    dropdown.style.top = "auto"
                    dropdown.style.bottom = "100%"
                  }
                })
              }

              editor.editing.view.document.on('keydown', (e, data) => handleEnter(e, data, editor))
              editor.model.document.on('change', async () => {
                setTimeout(() => {
                  const newHeight = editor.ui.view.element.offsetHeight;
                  setEditorHeight(newHeight);
                }, 0)
              });
            }}
            onChange={(e, editor) => {
              setNewMessage(editor.getData())
            }}
            onFocus={() => {
              setFocused(true)
            }}
            onBlur={() => setFocused(false)}
          />
          <div id="channel-window_buttons">
            <button
              id="channel-window_textarea-format"
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
              id="channel-window_textarea-emoji"
              onClick={async (e) => {
                e.stopPropagation()
                setShowEmojiPicker((prev) => !prev)
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
              id="channel-window_textarea-mention"
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
            <span id="channel-window_instruction">
              <b>Ctrl + Enter</b> to send message
            </span>
            <button
              id="channel-window_textarea-submit"
              ref={submitRef}
              disabled={!newMessage}
              onClick={handleSubmit}
            >
              <i className="fa-solid fa-paper-plane" /> Send
            </button>
          </div>
          {
            editor && showEmojiPicker &&
            <div id="channel-window_emoji-picker" ref={emojiRef}>
              <EmojiPicker
                emojiStyle="native"
                autoFocusSearch={false}
                height={Math.min(emojiButtonRef.current.getBoundingClientRect().top - 110, 400)}
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
        <div
          id="channel-window_textarea-background"
          ref={backgroundRef}
        >
        </div>
      </animated.div>
      <animated.div
        id="channel-window_thread"
        style={ThreadProps}
        className={showThread ? "expand" : ""}
      >
        <Thread />
      </animated.div>
    </div>
  )
}
