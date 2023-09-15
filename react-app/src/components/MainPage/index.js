import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Redirect } from "react-router-dom";
import Navigation from "../Navigation";
import { NoWorkspace } from "../NoWorkspace"
import { updateActiveWorkspace } from "../../store/session";
import { getWorkspaces, getActiveWorkspaces } from "../../store/workspaces";
import { ChatRoom } from "./ChatRoom";
import { io } from 'socket.io-client';
import { authenticate } from "../../store/session";

let socket

export function MainPage() {
  const dispatch = useDispatch();
  const sessionUser = useSelector((state) => state.session.user);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false)
  const [socketCreated, setSocketCreated] = useState(false)


  // If user has workspaces but no active workspace, set the first workspace
  // in the list as active workspace
  useEffect(() => {
    if (!sessionUser) {
      return <Redirect to="/login" />
    }
    if (sessionUser.workspaces.length) {
      if (!sessionUser.activeWorkspace) {
        dispatch(updateActiveWorkspace(sessionUser.id, sessionUser.workspaces[0].id))
          .then(() => dispatch(getWorkspaces()))
          .then(() => dispatch(getActiveWorkspaces(sessionUser.workspaces[0].id)))
          .then(() => setWorkspaceLoaded(true))
      } else {
        dispatch(getWorkspaces())
          .then(() => dispatch(getActiveWorkspaces(sessionUser.activeWorkspace.id)))
          .then(() => setWorkspaceLoaded(true))
      }
    }
  }, [dispatch, sessionUser])

  useEffect(() => {
    socket = io();
    if (sessionUser) {
      socket.emit("join_room", { room: `user${sessionUser.id}` })
    }
    setSocketCreated(true)

    return (() => {
      socket.disconnect()
    })
  }, [])


  if (!sessionUser) {
    return <Redirect to="/login" />
  } else {
    const workspaces = sessionUser.workspaces
    if (!workspaces.length) {
      return (
        <div className="main-page_container">
          {socketCreated && <Navigation hasWorkspace={false} socket={socket} />}
          <NoWorkspace />
        </div>
      )
    } else {
      return (
        <div className="main-page_container">
          {workspaceLoaded && socketCreated && <Navigation hasWorkspace={true} socket={socket} />}
          {workspaceLoaded && socketCreated && <ChatRoom user={sessionUser} socket={socket} />}
        </div>
      )
    }
  }
}
