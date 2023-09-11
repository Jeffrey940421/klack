import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Redirect } from "react-router-dom";
import "./MainPage.css"
import { updateActiveWorkspace } from "../../store/session";
import { CreateWorkspace } from "../CreateWorkspace";
import { useModal } from '../../context/Modal';

export function ChatRoom({ user }) {
  const dispatch = useDispatch();
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const activeWorkspace = useSelector((state) => state.workspaces.activeWorkspace);
  const channels = activeWorkspace.channels
  const { setModalContent } = useModal();

  const [activeChannel, setActiveChannel] = useState(Object.values(channels)[0].id)

  const switchWorkspace = (workspaceId) => {
    if (workspaceId !== activeWorkspace.id) {
      dispatch(updateActiveWorkspace(user.id, workspaceId))
    }
  }

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
        <h3>
          <button>

          </button>
          {activeWorkspace.name}
        </h3>
        <span>Channels</span>
        <div id="chat-room_channel-dropdown">
          {Object.values(channels).map(channel => {
            return (
              <div key={channel.id}>
                <button>
                  # {channel.name}
                </button>
              </div>
            )
          })}
        </div>
        <button>
          Add channels
        </button>
      </div>
    </div>
  )
}
