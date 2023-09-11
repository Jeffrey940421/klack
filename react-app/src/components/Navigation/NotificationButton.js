import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import OpenModalButton from "../OpenModalButton";
import { processInvitation } from "../../store/session";

function NotificationButton({ user, hasWorkspace }) {
  const dispatch = useDispatch();
  const [showMenu, setShowMenu] = useState(false);
  const ulRef = useRef();

  const openMenu = () => {
    setShowMenu((prev) => !prev);
  };

  const invitations = user.receivedWorkspaceInvitations.filter(invitation => invitation.status === "pending")

  useEffect(() => {
    if (!showMenu) return;

    const closeMenu = (e) => {
      if (!ulRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("click", closeMenu);

    return () => document.removeEventListener("click", closeMenu);
  }, [showMenu]);

  return (
    <>
      <button id="notification-button_button" onClick={openMenu}>
        {invitations.length ? <i className="fa-solid fa-bell fa-shake" /> : <i className="fa-solid fa-bell" /> }
        <div id="notification-button_number" className={invitations.length ? "" : "hidden"}>
          {invitations.length}
        </div>
      </button>
      <ul id="notification-button_dropdown" className={(showMenu ? "" : "hidden") + (hasWorkspace ? "" : " no-workspace")} ref={ulRef}>
        <li>Invitations</li>
        {
          invitations.length ?
            invitations.map((invitation, i) => {
              return (
                <li className="notification-button_invitation" key={invitation.id}>
                  {invitation.sender.nickname} (invitation.sender.email) invited you to join workspace {invitation.workspaceName}.
                  <li className="notification-button_invitation-buttons">
                    <button
                      onClick={() => {
                        try {
                          dispatch(processInvitation(invitation.id, "accept"))
                        } catch (e) {
                          console.log(e)
                        }
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => dispatch(processInvitation(invitation.id, "ignore"))}
                    >
                      Ignore
                    </button>
                  </li>
                </li>
              )
            }) :
            <li id="notification-button_no-notification">
              <span>No Notification</span>
            </li>
        }
      </ul>
    </>
  );
}

export default NotificationButton;
