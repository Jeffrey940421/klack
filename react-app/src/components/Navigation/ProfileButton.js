import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../store/session";
import OpenModalButton from "../OpenModalButton";
import { useModal } from '../../context/Modal';
import { EditProfile } from "../EditProfile";

function ProfileButton({ user, hasWorkspace, socket }) {
  const dispatch = useDispatch();
  const activeWorkspace = useSelector(state => state.workspaces.activeWorkspace)
  const userProfile = activeWorkspace ? activeWorkspace.users[user.id] : null
  const [showMenu, setShowMenu] = useState(false);
  const ulRef = useRef();
  const { setModalContent } = useModal();

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
    socket.emit("leave_room", {room: `user${user.id}`})
    dispatch(logout());
  };

  return (
    <>
      <button id="profile-button_button" onClick={openMenu}>
        {hasWorkspace ?
          <img id="profile-button_profile-image" src={userProfile?.profileImageUrl} alt="profile image" /> :
          <i className="fa-solid fa-bars" />
        }
      </button>
      <ul id="profile-button_dropdown" className={showMenu ? "" : "hidden"} ref={ulRef}>
        {hasWorkspace ?
          <>
            <li>
              <img id="profile-button_dropdown-profile-image" src={userProfile?.profileImageUrl} alt="profile image" />
              <div>
                <span>{userProfile?.nickname}</span>
                <span>{user.email}</span>
              </div>
            </li>
            <li onClick={() => setModalContent(<EditProfile profile={userProfile} workspace={activeWorkspace}/>)}>
              <button>Edit Profile</button>
            </li>
          </>
          :
          <li>
            <span>{user.email}</span>
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
