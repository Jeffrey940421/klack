import { useModal } from "../../context/Modal"
import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addToChannel } from "../../store/channels";
import "./JoinChannel.css"

export function JoinChannel() {
  const dispatch = useDispatch()
  const workspace = useSelector((state) => state.workspaces.activeWorkspace)
  const channel = useSelector((state) => state.channels.activeChannel)
  const [keyword, setKeywork] = useState("")
  const [showResult, setShowResult] = useState(false)
  const workspaceUsers = Object.values(workspace.users)
  const channelUsers = Object.values(channel.users)
  const channelUserIds = channelUsers.map(user => user.id)
  const divRef = useRef();
  const inputRef = useRef();
  const availableUsers = workspaceUsers.filter(user => !channelUserIds.includes(user.id) && (user.nickname.toLowerCase().includes(keyword.toLowerCase()) || user.email.includes(keyword.toLowerCase())))

  const addPeople = async (e, user) => {
    await dispatch(addToChannel(channel.id, user.id))
  }

  useEffect(() => {
    if (!showResult) return;

    const closeMenu = (e) => {
      if (divRef.current && inputRef.current && !divRef.current.contains(e.target) && !inputRef.current.contains(e.target)) {
        setShowResult(false);
      }
    };

    document.addEventListener("click", closeMenu);

    return () => document.removeEventListener("click", closeMenu);
  }, [showResult]);

  return (
    <div id="join-channel_container">
      <div id="join-channel_header">
        <h3>Add people</h3>
        <span># {channel.name}</span>
      </div>
      <div className="input">
        <label>
          Name or Email
        </label>
        <input
          type="text"
          ref={inputRef}
          placeholder="Find members"
          value={keyword}
          onChange={(e) => setKeywork(e.target.value)}
          onFocus={() => setShowResult(true)}
          // onBlur={() => setFocused(false)}
        />
      </div>

      <div id="join-channel_search-result" className={keyword && showResult ? "" : "hidden"} ref={divRef}>
        {availableUsers.map((user, i) => {
          return (
            <div key={user.id} className="join-channel_user">
              <div>
                <img src={user.profileImageUrl} alt="profile_image" />
                <span>{user.nickname} ({user.email})</span>
              </div>
              <button
                onClick={(e) => addPeople(e, user)}
              >
                Add
              </button>
            </div>
          )
        })}
        {!availableUsers.length && <span id="join-channel_no-result">No matches found for <b>{keyword}</b></span>}
      </div>
    </div>
  )
}
