import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as sessionActions from "../../store/session";
import { useModal } from '../../context/Modal';
import { useSocket } from "../../context/SocketContext";
import { EditProfile } from "../EditProfile";

function ProfileButton() {
  const dispatch = useDispatch();
  const sessionUser = useSelector(state => state.session.user);
  const users = useSelector(state => state.users);
  const activeWorkspaceId = sessionUser.activeWorkspaceId;
  const activeWorkspace = useSelector(state => state.workspaces.workspaceList[activeWorkspaceId]);
  const workspaceUsers = activeWorkspaceId ? users[activeWorkspaceId] : null
  const profile = workspaceUsers ? workspaceUsers[sessionUser.id] : null;
  const [showMenu, setShowMenu] = useState(false);
  const ulRef = useRef();
  const { setModalContent } = useModal();
  const { socketConnection } = useSocket()

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

  const handleLogout = (e) => {
    e.preventDefault();
    setShowMenu(false)
    socketConnection.emit("leave_room", { room: `user${sessionUser.id}` })
    dispatch(sessionActions.logout());
  };

  return (
    <>
      <button
        id="profile-button_button"
        onClick={openMenu}
      >
        {
          profile ?
            <img
              id="profile-button_profile-image"
              src={profile.profileImageUrl}
              alt="profile image"
            /> :
            <i className="fa-solid fa-bars" />
        }
      </button>
      <ul
        id="profile-button_dropdown"
        className={showMenu ? "" : "hidden"}
        ref={ulRef}
      >
        {profile ?
          <>
            <li>
              <img id="profile-button_dropdown-profile-image" src={profile.profileImageUrl} alt="profile image" />
              <div>
                <span>{profile.nickname}</span>
                <span>{profile.email}</span>
              </div>
            </li>
            <li onClick={() => {
              setShowMenu(false)
              setModalContent(<EditProfile profile={profile} />)
            }}>
              <button>Edit Profile</button>
            </li>
          </>
          :
          <li>
            <span>{sessionUser.email}</span>
          </li>
        }
        <hr></hr>
        <li onClick={handleLogout}>
          <button>Log Out</button>
        </li>
      </ul>
    </>
  );
}

export default ProfileButton;
