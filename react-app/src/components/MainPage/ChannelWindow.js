import { useModal } from "../../context/Modal"
import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CreateChannel } from "../CreateChannel";
import { removeChannel, leaveCurrentChannel } from "../../store/channels";
import { authenticate } from "../../store/session";
import { ChannelDetails } from "../ChannelDetails";
import { JoinChannel } from "../JoinChannel";
import { Message } from "../Message";
import { addChannelMessage, addWorkspaceMessage, createMessage, getChannelMessages, getWorkspaceMessages } from "../../store/messages";

export function ChannelWindow({ channel, socket }) {
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

  const openChannelMenu = () => {
    setShowChannelMenu((prev) => !prev);
  };

  const deleteChennel = async () => {
    setShowChannelMenu(false)
    await dispatch(removeChannel(channel.id))
    await dispatch(authenticate())
  }

  const leaveChannel = async () => {
    setShowChannelMenu(false)
    await dispatch(leaveCurrentChannel(channel.id))
    await dispatch(authenticate())
  }

  const handleEnter = (e) => {
    const keyCode = e.which || e.keyCode;

    if (keyCode === 13 && !e.shiftKey) {
      e.preventDefault()
      submitRef && submitRef.current.click()
    }
  }

  const handleSubmit = async (e) => {
    await dispatch(createMessage(channel.id, newMessage))
    setNewMessage("")
    e.target.parentNode.dataset.replicatedValue = ""
  }

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
        .then(() => setMessageLoaded(true))
    }
  }, [dispatch, channel])

  useEffect(() => {
    const channelArr = Object.values(channels)
    for (let channel of channelArr) {
      socket.emit("join_room", { room: `channel${channel.id}` })
    }
    socket.on("send_message", async (data) => {
      console.log("aaaaaaaa")
      const message = JSON.parse(data.message)
      console.log(message)
      if (message.channelId === channel.id) {
        await dispatch(addChannelMessage(message))
      }
      await dispatch(addWorkspaceMessage(message))
    })
    return (() => {
      const channelArr = Object.values(channels)
      for (let channel of channelArr) {
        socket.emit("leave_room", { room: `channel${channel.id}` })
      }
    })
  }, [channels])

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
            <img src={channel?.creator.profileImageUrl} alt="member" />
            <span>{channel?.users && Object.values(channel.users)?.length}</span>
          </div>
          <ul id="channel-window_channel-dropdown" className={showChannelMenu ? "" : "hidden"} ref={ulRef}>
            {
              user?.id === channel?.creator.id &&
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
                user?.id === channel?.creator.id ?
                  <>
                    <hr></hr>
                    <li
                      id="channel-window_delete-channel"
                      onClick={deleteChennel}
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
          {messageLoaded && <Message channel={channel} />}
        </div>
        <div id="channel-window_textarea" className={focused ? "focused" : ""}>
          <div>
            <textarea
              placeholder={`Message #${channel?.name}`}
              onInput={(e) => e.target.parentNode.dataset.replicatedValue = e.target.value}
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
          </div>
        </div>
      </div>
    </div>
  )
}
