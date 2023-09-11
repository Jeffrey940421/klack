import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Redirect } from "react-router-dom";
import Navigation from "../Navigation";
import { NoWorkspace } from "../NoWorkspace"
import { updateActiveWorkspace } from "../../store/session";
import { getWorkspaces, getActiveWorkspaces } from "../../store/workspaces";
import { ChatRoom } from "./ChatRoom";

export function MainPage() {
  const dispatch = useDispatch();
  const sessionUser = useSelector((state) => state.session.user);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false)

  // If user has workspaces but no active workspace, set the first workspace
  // in the list as active workspace
  useEffect(() => {
    if (!sessionUser) {
      return <Redirect to="/login" />
    }
    if (sessionUser.workspaces.length) {
      if (!sessionUser.active_workspace) {
        dispatch(updateActiveWorkspace(sessionUser.id, sessionUser.workspaces[1].id))
          .then(() => dispatch(getWorkspaces()))
          .then(() => dispatch(getActiveWorkspaces(sessionUser.active_workspace.id)))
          .then(() => setWorkspaceLoaded(true))
      } else {
        dispatch(getWorkspaces())
          .then(() => dispatch(getActiveWorkspaces(sessionUser.active_workspace.id)))
          .then(() => setWorkspaceLoaded(true))
      }
    }
  }, [dispatch, sessionUser])


  if (!sessionUser) {
    return <Redirect to="/login" />
  } else {
    const workspaces = sessionUser.workspaces
    if (!workspaces.length) {
      return (
        <div className="main-page_container">
          <Navigation hasWorkspace={false} />
          <NoWorkspace />
        </div>
      )
    } else {
      return (
        <div className="main-page_container">
          {workspaceLoaded && <Navigation hasWorkspace={true} />}
          {workspaceLoaded && <ChatRoom user={sessionUser} />}
        </div>
      )
    }
  }
}
