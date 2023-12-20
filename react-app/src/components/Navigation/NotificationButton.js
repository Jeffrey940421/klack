import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as sessionActions from "../../store/session";
import { useModal } from "../../context/Modal";
import { JoinWorkspace } from "../JoinWorkspace";

function NotificationButton() {
  const dispatch = useDispatch();
  const { setModalContent } = useModal()
  const [showMenu, setShowMenu] = useState(false);
  const ulRef = useRef();
  const receivedInvitations = useSelector((state) => state.session.receivedInvitations)
  const pendingReceivedInvitations = Object.values(receivedInvitations).filter(invitation => invitation.status === "pending")
  const workspaces = useSelector((state) => state.workspaces.organizedWorkspaces)

  const openMenu = () => {
    setShowMenu((prev) => !prev);
  };

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
      <button
        id="notification-button_button"
        onClick={openMenu}
      >
        {
          pendingReceivedInvitations.length ?
            <i className="fa-solid fa-bell fa-shake" /> :
            <i className="fa-solid fa-bell" />
        }
        <div
          id="notification-button_number"
          className={pendingReceivedInvitations.length ? "" : "hidden"}
        >
          {pendingReceivedInvitations.length}
        </div>
      </button>
      <ul
        id="notification-button_dropdown"
        className={(showMenu ? "" : "hidden") + (workspaces.length ? "" : " no-workspace")}
        ref={ulRef}
      >
        <li>Invitations</li>
        {
          pendingReceivedInvitations.length ?
          pendingReceivedInvitations.map((invitation) => {
              return (
                <li
                  className="notification-button_invitation"
                  key={invitation.id}
                >
                  <span>
                    <b>{invitation.senderEmail}</b> invited you to join workspace <b>{invitation.workspaceName}</b>.
                  </span>
                  <div className="notification-button_invitation-buttons">
                    <button
                      onClick={() => setModalContent(<JoinWorkspace invitation={invitation} />)}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => dispatch(sessionActions.processInvitation(invitation.id, "ignore"))}
                    >
                      Ignore
                    </button>
                  </div>
                </li>
              )
            }) :
            <li id="notification-button_no-notification">
              <span>No Pending Invitation</span>
            </li>
        }
      </ul>
    </>
  );
}

export default NotificationButton;
