import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useThread } from "../../context/ThreadContext";
import { usePopup } from "../../context/Popup";
import { Loader } from "../Loader";
import * as workspaceActions from "../../store/workspaces"
import * as sessionActions from "../../store/session"
import * as channelActions from "../../store/channels"
import * as messageActions from "../../store/messages"
import * as userActions from "../../store/users"
import { CreateWorkspace } from "../CreateWorkspace";
import { EditWorkspace } from "../EditWorkspace";
import { Invitation } from "../Invitation";
import { CreateChannel } from "../CreateChannel";
import { useModal } from '../../context/Modal';
import { ChannelWindow } from "./ChannelWindow";
import "./MainPage.css"

export function ChatRoom() {
  const dispatch = useDispatch();
  const sessionUser = useSelector((state) => state.session.user);
  const activeWorkspaceId = sessionUser.activeWorkspaceId;
  const workspaces = useSelector((state) => state.workspaces.workspaceList);
  const activeWorkspace = workspaces[activeWorkspaceId];
  const workspaceIds = useSelector((state) => state.workspaces.organizedWorkspaces);
  const channels = useSelector((state) => state.channels.channelList);
  const activeChannelId = workspaces[activeWorkspaceId] ? workspaces[activeWorkspaceId].activeChannelId : null;
  const activeChannel = activeChannelId ? channels[activeChannelId] : null;
  const organizedChannels = useSelector((state) => state.channels.organizedChannels);
  const channelIds = activeWorkspaceId ? organizedChannels[activeWorkspaceId] : [];
  const users = useSelector((state) => state.users);
  const workspaceUser = users[activeWorkspaceId] ? users[activeWorkspaceId][sessionUser.id] : null;
  const messages = useSelector((state) => state.messages.messageList);
  const { setModalContent } = useModal();
  const ulRef = useRef();
  const [channelExpanded, setChannelExpanded] = useState(true)
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const { showThread, setShowThread } = useThread();
  const { setPopupContent, closePopup } = usePopup()

  const switchWorkspace = async (workspaceId) => {
    if (workspaceId !== activeWorkspaceId && workspaceId in workspaces) {
      setShowThread(false)
      const data = await dispatch(sessionActions.setActiveWorkspace(sessionUser.id, workspaceId))
      if (!Array.isArray(data)) {
        const prevActiveChannel = data.prevActiveChannel
        if (prevActiveChannel.id in channels) {
          await dispatch(channelActions.addChannel(prevActiveChannel))
        }
      }
    }
  }

  const switchChannel = async (channelId) => {
    if (channelId !== activeChannelId && channelId in channels) {
      setShowThread(false)
      const data = await dispatch(workspaceActions.setActiveChannel(activeWorkspaceId, channelId))
      if (!Array.isArray(data)) {
        const prevActiveChannel = data.prevActiveChannel
        if (prevActiveChannel.id in channels) {
          await dispatch(channelActions.addChannel(prevActiveChannel))
        }
      }
    }
  }

  const deleteWorkspace = async (workspaceId) => {
    setPopupContent(<Loader text="Deleting Workspace ..." />)
    setShowWorkspaceMenu(false)
    const user = await dispatch(workspaceActions.removeWorkspace(workspaceId))
    await dispatch(sessionActions.setUser(user))
    await dispatch(channelActions.deleteWorkspaceChannels(workspaceId))
    await dispatch(messageActions.deleteWorkspaceMessages(workspaceId))
    await dispatch(userActions.deleteWorkspaceUsers(workspaceId))
    closePopup()
  }

  const leaveWorkspace = async () => {
    setPopupContent(<Loader text="Leaving Workspace ..." />)
    setShowWorkspaceMenu(false)
    const user = await dispatch(workspaceActions.leaveWorkspace(activeWorkspaceId))
    await dispatch(sessionActions.setUser(user))
    await dispatch(channelActions.deleteWorkspaceChannels(activeWorkspaceId))
    await dispatch(messageActions.deleteWorkspaceMessages(activeWorkspaceId))
    await dispatch(userActions.deleteWorkspaceUsers(activeWorkspaceId))
    closePopup()
  }

  const getWorkspaceUnreadMessages = (workspaceId) => {
    if (workspaceId === activeWorkspaceId) return 0;
    const unreadMessages = Object.values(messages).filter(message => {
      const channelId = message.channelId
      const channel = channels[channelId]
      return message.workspaceId === workspaceId
        && new Date(message.createdAt) > new Date(channel.lastViewedAt)
    })
    return unreadMessages
  }

  const getChannelUnreadMessages = (channelId) => {
    if (channelId === activeChannelId) return 0;
    const unreadMessages = Object.values(messages).filter(message => {
      const channel = channels[channelId]
      return message.channelId === channelId
        && new Date(message.createdAt) > new Date(channel.lastViewedAt)
    })
    return unreadMessages
  }

  const openWorkspaceMenu = () => {
    setShowWorkspaceMenu((prev) => !prev);
  };

  useEffect(() => {
    if (!showWorkspaceMenu) return;

    const closeWorkspaceMenu = (e) => {
      if (ulRef.current && !ulRef.current.contains(e.target)) {
        setShowWorkspaceMenu(false);
      }
    };

    document.addEventListener("click", closeWorkspaceMenu);

    return () => document.removeEventListener("click", closeWorkspaceMenu);
  }, [showWorkspaceMenu]);

  return (
    <div id="chat-room_container">
      <div id="chat-room_workspaces-sidebar-container">
        <div id="chat-room_workspaces-sidebar">
          {
            workspaceIds
              .map(id => workspaces[id])
              .map(workspace => {
                return (
                  <div key={workspace.id}>
                    <button
                      className={`chat-room_workspace${workspace.id === activeWorkspaceId ? " active" : ""}`}
                      onClick={() => switchWorkspace(workspace.id)}
                    >
                      <img src={workspace.iconUrl} />
                      {
                        getWorkspaceUnreadMessages(workspace.id).length > 0 &&
                        <div className="chat-room_workspace-message-alert">
                          <div></div>
                        </div>
                      }
                    </button>
                    <span className="chat-room_workspace-name">
                      <span>
                        {workspace.name}
                      </span>
                    </span>
                  </div>
                )
              })
          }
          <div>
            <button
              id="chat-room_create-workspace"
              onClick={() => setModalContent(<CreateWorkspace />)}
            >
              <i className="fa-solid fa-plus" />
            </button>
            <span id="chat-room_create-workspace-label">
              Create workspaces
            </span>
          </div>
        </div>
        <div id="chat-room_workspaces-sidebar-spacer"></div>
      </div>
      <div id="chat-room_channel-sidebar">
        <div id="chat-room_channel-sidebar-background">
          <button
            id="chat-room_workspace-edit"
            onClick={openWorkspaceMenu}
          >
            <h3>{activeWorkspace?.name}</h3>
            <i className="fa-solid fa-angle-down" />
          </button>
          <hr></hr>
          <div id="chat-room_channel">
            <button
              onClick={() => setChannelExpanded((prev) => !prev)}
            >
              {channelExpanded ? <i className="fa-solid fa-caret-down" /> : <i className="fa-solid fa-caret-right" />}
            </button>
            <span>Channels</span>
          </div>
          <div
            id="chat-room_channel-dropdown"
            className={channelExpanded ? "" : "hidden"}
          >
            {
              channelIds
                .map(id => channels[id])
                .map(channel => {
                  return (
                    <div key={channel.id}>
                      <button
                        id={activeChannelId === channel.id ? "chat-room_active-channel" : ""}
                        onClick={() => switchChannel(channel.id)}
                      >
                        <span>
                          <i className="fa-solid fa-hashtag" />
                          {channel.name}
                        </span>
                        {
                          getChannelUnreadMessages(channel.id).length > 0 &&
                          <span className="chat-room_channel_new_message">
                            {
                              getChannelUnreadMessages(channel.id).length <= 99 ?
                                getChannelUnreadMessages(channel.id).length :
                                "99+"
                            }
                          </span>
                        }
                      </button>
                    </div>
                  )
                })}
          </div>
          <button
            id="chat-room_add-channel"
            onClick={() => setModalContent(<CreateChannel type="create" workspace={activeWorkspace} />)}
          >
            <i className="fa-solid fa-plus" />
            Add Channels
          </button>
          <button
            id="chat-room_add-coworker"
            className={workspaceUser?.role === "admin" ? "" : "hidden"}
            onClick={() => setModalContent(<Invitation workspace={activeWorkspace} />)}
          >
            <i className="fa-solid fa-plus" />
            Add Cowokers
          </button>
        </div>
      </div>
      <ul
        id="chat-room_workspace-dropdown"
        className={showWorkspaceMenu ? "" : "hidden"}
        ref={ulRef}
      >
        <li>
          <img
            id="chat-room_workspace-icon"
            src={activeWorkspace?.iconUrl}
            alt="workspace icon"
          />
          <span>{activeWorkspace?.name}</span>
        </li>
        {
          workspaceUser?.role === "admin" &&
          <>
            <hr></hr>
            <li
              onClick={() => {
                setShowWorkspaceMenu(false)
                setModalContent(<Invitation workspace={activeWorkspace}/>)
              }}
            >
              <span>Invite People to Join Workspace</span>
            </li>
            <li
              onClick={() => {
                setShowWorkspaceMenu(false)
                setModalContent(<EditWorkspace workspace={activeWorkspace} />)
              }}
            >
              <span>Edit Workspace</span>
            </li>
          </>
        }
        <hr></hr>
        {
          workspaceUser?.role === "admin" ?
            <li
              id="chat-room_delete-workspace"
              onClick={() => {
                setShowWorkspaceMenu(false)
                deleteWorkspace(activeWorkspaceId)
              }}
            >
              <span>Delete Workspace</span>
            </li> :
            <li
              id="chat-room_leave-workspace"
              onClick={() => {
                setShowWorkspaceMenu(false)
                leaveWorkspace()
              }}
            >
              <span>Leave Workspace</span>
            </li>
        }
      </ul>
      {activeChannel && <ChannelWindow key={activeChannel.id} />}
    </div>
  )
}
