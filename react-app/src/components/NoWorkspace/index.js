import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../store/session";
import { Redirect } from "react-router-dom";
import './NoWorkspace.css';

export function NoWorkspace({ isLoaded }) {
  const dispatch = useDispatch();
  const sessionUser = useSelector((state) => state.session.user);

  return (
    <div id="no-workspace_container">
      <header id="no-workspace_header">
        <img id="no-workspace_logo" className="logo" src="/klack_logo.svg" alt="logo" />
        {isLoaded && (
          <div id="no-workspace_account">
            <span>Confirmed as <b>{sessionUser.email}</b></span>
            <a onClick={() => dispatch(logout())}>Change</a>
          </div>
        )}
      </header>
      <div id="no-workspace_body">
        <div id="no-workspace_create">
          <h2>Create a new Klack workspace</h2>
          <p>Klack gives your team a home — a place where they can talk and work together. To create a new workspace, click the button below.</p>
          <button>Create a Workspace</button>
          <span>By continuing, you’re agreeing to our Main Services Agreement, User Terms of Service, Privacy Policy, Cookie Policy and Klack Supplemental Terms.</span>
        </div>
        <div id="no-workspace_image">
          <img src="/create_workspace.svg" alt="create_workspace" />
        </div>
      </div>
    </div>
  )
}
