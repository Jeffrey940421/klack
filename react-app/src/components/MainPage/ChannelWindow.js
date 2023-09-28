import { useModal } from "../../context/Modal"
import React, { useEffect, useState, useRef, useContext } from "react";
import { useDispatch, useSelector, ReactReduxContext } from "react-redux";
import { CreateChannel } from "../CreateChannel";
import { removeChannel, leaveCurrentChannel, updateActiveChannel, updateChannel } from "../../store/channels";
import { authenticate } from "../../store/session";
import { ChannelDetails } from "../ChannelDetails";
import { JoinChannel } from "../JoinChannel";
import { Message } from "../Message";
import { addChannelMessage, addMessage, addWorkspaceMessage, createMessage, getAllMessages, getChannelMessages, getWorkspaceMessages } from "../../store/messages";
import { useRoom } from "../../context/RoomContext";
import * as channelActions from "../../store/channels"
import { CKEditor } from '@ckeditor/ckeditor5-react';
import Editor from 'ckeditor5-custom-build/build/ckeditor';
import EmojiPicker from 'emoji-picker-react';
import { Emoji, EmojiStyle } from 'emoji-picker-react';

export function ChannelWindow({ socket }) {
  const { setModalContent } = useModal();
  const [showChannelMenu, setShowChannelMenu] = useState(false)
  const ulRef = useRef();
  const dispatch = useDispatch()
  const user = useSelector((state) => state.session.user)
  const workspace = useSelector((state) => state.workspaces.activeWorkspace)
  const [messageLoaded, setMessageLoaded] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [focused, setFocused] = useState(false)
  const channels = useSelector((state) => state.channels.channels)
  const submitRef = useRef()
  const channel = useSelector((state) => state.channels.activeChannel);
  const allChannels = useSelector((state) => state.channels.allChannels)
  const [prevRooms, setPrevRooms] = useState([])
  const { channelRooms, setChannelRooms } = useRoom()
  const [editorHeight, setEditorHeight] = useState(0);
  const [editor, setEditor] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiRef = useRef()
  const emojiButtonRef = useRef()
  const [showFormat, setShowFormat] = useState(true)
  const [mention, setMention] = useState("")
  const { store } = useContext(ReactReduxContext)

  const getFeedItems = async (queryText) => {
    const channelUsers = store.getState().channels.activeChannel.users
    const items = Object.values(channelUsers)
      .filter(userInfo => {
        return userInfo.nickname.toLowerCase().includes(queryText.toLowerCase())
            || userInfo.email.toLowerCase().includes(queryText.toLowerCase())
      })
      .map(user => {
        return {
          id: `@${user.nickname}`,
          userId: user.id,
          name: user.nickname,
          profileImageUrl: user.profileImageUrl
        }
      })
    if (!queryText) {
      items.unshift({
        id: "@channel",
        userId: "channel",
        name: "Notify everyone in this channel",
      })
    }
    return items
  }

  const openChannelMenu = () => {
    setShowChannelMenu((prev) => !prev);
  };

  const deleteChannel = async () => {
    setShowChannelMenu(false)
    await dispatch(removeChannel(channel.id))
    await dispatch(authenticate())
  }

  const leaveChannel = async () => {
    setShowChannelMenu(false)
    await dispatch(leaveCurrentChannel(channel.id))
    await dispatch(authenticate())
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

  const handleSubmit = async (e) => {
    await dispatch(createMessage(channel.id, newMessage))
    setNewMessage("")
    e.target.parentNode.dataset.replicatedValue = ""
  }

  useEffect(() => {
    document.addEventListener("click", (e) => {
      if (emojiRef.current && emojiButtonRef.current && !emojiRef.current.contains(e.target) && !emojiButtonRef.current.contains(e.target)) {
        setShowEmojiPicker(false)
      }
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
    if (channel) {
      dispatch(getChannelMessages(channel.id))
        .then(() => dispatch(getWorkspaceMessages(workspace.id)))
        .then(() => dispatch(getAllMessages()))
        .then(() => setMessageLoaded(true))
    }
  }, [dispatch, channel, workspace])

  useEffect(() => {
    const rooms = allChannels.map(channelId => `channel${channelId}`)
    socket.emit("join_room", { rooms: rooms })
    setChannelRooms(rooms)

    return (() => {
      socket.emit("leave_room", { rooms: channelRooms })
    })
  }, [allChannels])

  useEffect(() => {
    socket.on("send_message", async (data) => {
      const message = JSON.parse(data.message)
      if (message.channelId === channel.id) {
        await dispatch(addChannelMessage(message))
      }
      if (message.workspaceId === workspace.id) {
        await dispatch(addWorkspaceMessage(message))
      }
      await dispatch(addMessage(message))
    })

    return (() => {
      socket.off("send_message")
    })
  }, [channel, workspace])

  useEffect(() => {
    socket.on("edit_channel", async (data) => {
      const updatedChannel = JSON.parse(data.channel)
      if (updatedChannel.id === channel.id) {
        await dispatch(updateActiveChannel(updatedChannel))
      }
      await dispatch(updateChannel(updatedChannel))
    })
    socket.on("delete_channel", async (data) => {
      const activeChannel = JSON.parse(data.channel)
      const id = data.id
      await dispatch(channelActions.deleteChannel(id, activeChannel))
    })

    return (() => {
      socket.off("edit_channel")
      socket.off("delete_channel")
    })
  }, [channel])

  return (
    <div id="channel-window_container">
      <div id="channel-window_background">
        <div id="channel-window_header">
          <div
            id="channel-window_title"
            onClick={openChannelMenu}
          >
            <i className="fa-solid fa-hashtag" />
            <h3>{channel?.name}</h3>
            <i className="fa-solid fa-angle-down" />
          </div>
          <div
            id="channel-window_members"
            onClick={() => setModalContent(<ChannelDetails channel={channel} defaultMenu="members" />)}
          >
            <img src={channel?.creator.profileImageUrl ? channel?.creator.profileImageUrl : Object.values(channel?.users)[0].profileImageUrl} alt="member" />
            <span>{channel?.users && Object.values(channel.users)?.length}</span>
          </div>
          <ul id="channel-window_channel-dropdown" className={showChannelMenu ? "" : "hidden"} ref={ulRef}>
            {
              (user?.id === channel?.creator.id || user?.id === workspace?.owner.id) &&
              <li
                onClick={() => {
                  setModalContent(<CreateChannel type="edit" channel={channel} workspace={workspace} />)
                  setShowChannelMenu(false)
                }}
              >
                Edit Channel
              </li>
            }
            {
              channel?.name !== "general" &&
              <li
                onClick={() => {
                  setModalContent(<JoinChannel channel={channel} workspace={workspace} />)
                  setShowChannelMenu(false)
                }}
              >
                Add People to Channel
              </li>
            }
            <li
              onClick={() => {
                setModalContent(<ChannelDetails channel={channel} defaultMenu="about" />)
                setShowChannelMenu(false)
              }}
            >
              Channel Details
            </li>
            {
              channel?.name !== "general" ?
                (user?.id === channel?.creator.id || user?.id === workspace?.owner.id) ?
                  <>
                    <hr></hr>
                    {
                      user?.id === workspace?.owner.id &&
                      <li
                        id="channel-window_leave-channel"
                        onClick={leaveChannel}
                      >
                        Leave Channel
                      </li>
                    }
                    <li
                      id="channel-window_delete-channel"
                      onClick={deleteChannel}
                    >
                      Delete Channel
                    </li>
                  </> :
                  <>
                    <hr></hr>
                    <li
                      id="channel-window_leave-channel"
                      onClick={leaveChannel}
                    >
                      Leave Channel
                    </li>
                  </> :
                null
            }
          </ul>
        </div>
        <hr></hr>
        <div id="channel-window_body">
          {messageLoaded && <Message channel={channel} editorHeight={editorHeight} />}
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
              placeholder: `Message #${channel?.name}`,
              mention: {
                dropdownLimit: 6,
                feeds: [
                  {
                    marker: '@',
                    feed: getFeedItems
                  }
                ]
              },
            }}
            onReady={(editor) => {
              setEditor(editor)
              editor.editing.view.document.on('keydown', (e, data) => handleEnter(e, data, editor))
              editor.model.document.on('change', () => {
                const newHeight = editor.ui.view.element.offsetHeight;
                if (editorHeight !== newHeight) {
                  setEditorHeight(newHeight);
                }
              });
            }}
            onChange={(e, editor) => {
              setNewMessage(editor.getData())
              console.log(editor.getData())
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
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              ref={emojiButtonRef}
            >
              {showEmojiPicker ? <i className="fa-solid fa-face-grin-tongue-squint" style={{ color: "#f2d202" }} /> : <i className="fa-regular fa-face-smile" />}
            </button>
            <button
              id="channel-window_textarea-mention"
              onClick={async () => {
                editor.model.change(writer => {
                  const insertPosition = editor.model.document.selection.getFirstPosition();
                  writer.insertText("@", insertPosition);
                  editor.editing.view.focus();
                  const latestSelection = editor.model.document.selection.getFirstPosition();
                  writer.setSelection(latestSelection);
                })
              }}
              ref={emojiButtonRef}
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
              />
            </div>
          }
        </div>
      </div>
    </div>
  )
}
