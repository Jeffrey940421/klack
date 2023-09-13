import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Redirect } from "react-router-dom";
import "./MainPage.css"
import { deleteLastWorkspace, updateActiveChannel, updateActiveWorkspace } from "../../store/session";
import { CreateWorkspace } from "../CreateWorkspace";
import { useModal } from '../../context/Modal';
import { EditWorkspace } from "../EditWorkspace";
import { leaveCurrentWorkspace, removeWorkspace } from "../../store/workspaces";
import { authenticate } from "../../store/session";
import { io } from 'socket.io-client';
import { Invitation } from "../Invitation";
import { getActiveChannel, getChannels } from "../../store/channels";
import { CreateChannel } from "../CreateChannel";
import { ChannelWindow } from "./ChannelWindow";


export function ChatRoom({ user, socket }) {
  const dispatch = useDispatch();
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const activeWorkspace = useSelector((state) => state.workspaces.activeWorkspace);
  const channels = useSelector((state) => state.channels.channels);
  const activeChannel = useSelector((state) => state.channels.activeChannel);
  const { setModalContent } = useModal();
  const ulRef = useRef();
  const [channelExpanded, setChannelExpanded] = useState(true)
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [channelLoaded, setChannelLoaded] = useState(false)

  const switchWorkspace = (workspaceId) => {
    if (workspaceId !== activeWorkspace.id) {
      dispatch(updateActiveWorkspace(user.id, workspaceId))
    }
  }

  const switchChannel = (channelId) => {
    if (channelId !== activeChannel?.id) {
      dispatch(updateActiveChannel(user.id, channelId))
    }
  }

  const openWorkspaceMenu = () => {
    setShowWorkspaceMenu((prev) => !prev);
  };

  const deleteWorkspace = async () => {
    setShowWorkspaceMenu(false)
    if (Object.values(workspaces).length === 1 && Object.values(workspaces)[0].id === activeWorkspace.id) {
      await dispatch(deleteLastWorkspace())
    }
    await dispatch(removeWorkspace(activeWorkspace.id))
    await dispatch(authenticate())
  }

  const leaveWorkspace = async () => {
    setShowWorkspaceMenu(false)
    if (Object.values(workspaces).length === 1 && Object.values(workspaces)[0].id === activeWorkspace.id) {
      await dispatch(deleteLastWorkspace())
    }
    await dispatch(leaveCurrentWorkspace(activeWorkspace.id))
    await dispatch(authenticate())
  }

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

  useEffect(() => {
    const workspaceArr = Object.values(workspaces)
    for (let workspace of workspaceArr) {
      socket.emit("join_room", { room: `workspace${workspace.id}`, email: user.email })
    }
    socket.on("delete_workspace", async (data) => {
      await dispatch(authenticate())
    })
    return (() => {
      const workspaceArr = Object.values(workspaces)
      for (let workspace of workspaceArr) {
        socket.emit("leave_room", { room: `workspace${workspace.id}` })
      }
    })
  }, [workspaces])

  useEffect(() => {
    dispatch(getChannels())
      .then((channels) => {
        if (channels.length && !user.activeChannel) {
          dispatch(updateActiveChannel(user.id, channels[0].id))
        }
      })
      .then(() => {
        if (user.activeChannel) {
          dispatch(getActiveChannel(user.activeChannel.id))
        }
      })
      .then(() => setChannelLoaded(true))
  }, [dispatch, user])

  return (
    <div id="chat-room_container">
      <div id="chat-room_workspaces-sidebar">
        {Object.values(workspaces).map(workspace => {
          return (
            <div key={workspace.id}>
              <button
                className={`chat-room_workspace ${workspace.id === activeWorkspace?.id ? "active" : ""}`}
                onClick={() => switchWorkspace(workspace.id)}
              >
                <img src={workspace.iconUrl} />
              </button>
              <span className="chat-room_workspace-name">
                {workspace.name}
              </span>
            </div>
          )
        })}
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

      {
        channelLoaded &&
        <>
          <div id="chat-room_channel-sidebar">
            <div id="chat-room_channel-sidebar-background">
              <button
                id="chat-room_workspace-edit"
                onClick={openWorkspaceMenu}
              >
                <h3>{activeWorkspace?.name}</h3><i className="fa-solid fa-angle-down" />
              </button>
              <ul id="chat-room_workspace-dropdown" className={showWorkspaceMenu ? "" : "hidden"} ref={ulRef}>
                <li>
                  <img id="chat-room_workspace-icon" src={activeWorkspace?.iconUrl} alt="workspace icon" />
                  <span>{activeWorkspace?.name}</span>
                </li>
                <hr className={user.id === activeWorkspace?.owner.id ? "" : "hidden"}></hr>
                <li
                  className={user.id === activeWorkspace?.owner.id ? "" : "hidden"}
                  onClick={() => {
                    setShowWorkspaceMenu(false)
                    setModalContent(<Invitation workspace={activeWorkspace} user={user} />)
                  }}
                >
                  <span>Invite People to Join Workspace</span>
                </li>
                <li
                  className={user.id === activeWorkspace?.owner.id ? "" : "hidden"}
                  onClick={() => {
                    setShowWorkspaceMenu(false)
                    setModalContent(<EditWorkspace workspace={activeWorkspace} />)
                  }}
                >
                  <span>Edit Workspace</span>
                </li>
                <hr></hr>
                <li
                  id="chat-room_delete-workspace"
                  className={user.id === activeWorkspace?.owner.id ? "" : "hidden"}
                  onClick={() => {
                    setShowWorkspaceMenu(false)
                    deleteWorkspace()
                  }}
                >
                  <span>Delete Workspace</span>
                </li>
                <li
                  id="chat-room_leave-workspace"
                  className={user.id !== activeWorkspace?.owner.id ? "" : "hidden"}
                  onClick={() => {
                    setShowWorkspaceMenu(false)
                    leaveWorkspace()
                  }}
                >
                  <span>Leave Workspace</span>
                </li>
              </ul>
              <hr></hr>
              <div button id="chat-room_channel">
                <button
                  onClick={() => setChannelExpanded((prev) => !prev)}
                >
                  {channelExpanded ? <i className="fa-solid fa-caret-down" /> : <i className="fa-solid fa-caret-right" />}
                </button>
                <span>Channels</span>
              </div>

              <div id="chat-room_channel-dropdown" className={channelExpanded ? "" : "hidden"}>
                {channels && Object.values(channels).map(channel => {
                  return (
                    <div key={channel.id}>
                      <button
                        id={activeChannel?.id === channel.id ? "chat-room_active-channel" : ""}
                        onClick={() => switchChannel(channel.id)}
                      >
                        <i className="fa-solid fa-hashtag" /> {channel.name}
                      </button>
                    </div>
                  )
                })}
              </div>
              <button
                id="chat-room_add-channel"
                onClick={() => setModalContent(<CreateChannel type="create" workspace={activeWorkspace} />)}
              >
                <i class="fa-solid fa-plus" />
                Add Channels
              </button>
              <button
                id="chat-room_add-coworker"
                className={user.id === activeWorkspace?.owner.id ? "" : "hidden"}
                onClick={() => setModalContent(<Invitation workspace={activeWorkspace} user={user} />)}
              >
                <i class="fa-solid fa-plus" />
                Add Cowokers
              </button>
            </div>
          </div>
          <ChannelWindow channel={activeChannel} />
        </>
      }

    </div>
  )
}
