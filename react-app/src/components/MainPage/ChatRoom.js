import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Redirect } from "react-router-dom";
import "./MainPage.css"
import { deleteLastWorkspace, updateActiveWorkspace } from "../../store/session";
import { CreateWorkspace } from "../CreateWorkspace";
import { useModal } from '../../context/Modal';
import { EditWorkspace } from "../EditWorkspace";
import { leaveCurrentWorkspace, removeWorkspace } from "../../store/workspaces";
import { authenticate } from "../../store/session";
import { io } from 'socket.io-client';
import { Invitation } from "../Invitation";


export function ChatRoom({ user, socket }) {
  const dispatch = useDispatch();
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const activeWorkspace = useSelector((state) => state.workspaces.activeWorkspace);
  //TODO: Need to change this to the channels that the current user joined
  const channels = activeWorkspace?.channels
  const { setModalContent } = useModal();
  const ulRef = useRef();
  const [activeChannel, setActiveChannel] = useState(channels ? Object.values(channels)[0].id : "")
  const [channelExpanded, setChannelExpanded] = useState(true)
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);

  const switchWorkspace = (workspaceId) => {
    if (workspaceId !== activeWorkspace.id) {
      dispatch(updateActiveWorkspace(user.id, workspaceId))
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
      socket.emit("join_room", { room: `workspace${workspace.id}` })
    }
    return (() => {
      const workspaceArr = Object.values(workspaces)
      for (let workspace of workspaceArr) {
        socket.emit("leave_room", { room: `workspace${workspace.id}` })
      }
    })
  }, [workspaces])

  useEffect(() => {
    socket.on("delete_workspace", async (data) => {
      await dispatch(authenticate())
    })
  }, [])

  return (
    <div id="chat-room_container">
      <div id="chat-room_workspaces-sidebar">
        {Object.values(workspaces).map(workspace => {
          return (
            <div key={workspace.id}>
              <button
                className={`chat-room_workspace ${workspace.id === activeWorkspace.id ? "active" : ""}`}
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
            >
              <span>Invite People to Join Workspace</span>
            </li>
            <li
              className={user.id === activeWorkspace?.owner.id ? "" : "hidden"}
              onClick={() => setModalContent(<EditWorkspace workspace={activeWorkspace} />)}
            >
              <span>Edit Workspace</span>
            </li>
            <hr></hr>
            <li
              className={user.id === activeWorkspace?.owner.id ? "" : "hidden"}
              onClick={() => deleteWorkspace()}
            >
              <span>{"Delete Workspace"}</span>
            </li>
            <li
              className={user.id !== activeWorkspace?.owner.id ? "" : "hidden"}
              onClick={() => leaveWorkspace()}
            >
              <span>{"Leave Workspace"}</span>
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
                  <button id={activeChannel === channel.id ? "chat-room_active-channel" : ""}>
                    <i className="fa-solid fa-hashtag" /> {channel.name}
                  </button>
                </div>
              )
            })}
          </div>
          <button>
            Add channels
          </button>
          <button
            className={user.id === activeWorkspace?.owner.id ? "" : "hidden"}
            onClick={() => setModalContent(<Invitation workspace={activeWorkspace} user={user}/>)}
          >
            Add coworkers
          </button>
        </div>
      </div>
    </div>
  )
}
