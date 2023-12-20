import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as channelActions from "../../store/channels";
import "./JoinChannel.css"

export function JoinChannel() {
  const dispatch = useDispatch()
  const [keyword, setKeywork] = useState("")
  const [showResult, setShowResult] = useState(false)
  const sessionUser = useSelector(state => state.session.user)
  const activeWorkspaceId = sessionUser.activeWorkspaceId
  const activeWorkspace = useSelector(state => state.workspaces.workspaceList[activeWorkspaceId])
  const activeChannelId = activeWorkspace.activeChannelId
  const channels = useSelector(state => state.channels.channelList)
  const activeChannel = channels[activeChannelId]
  const users = useSelector(state => state.users)
  const workspaceUsers = Object.values(users[activeWorkspaceId])
  const channelUserIds = activeChannel.users
  const availableUsers = workspaceUsers.filter(user => {
    return !channelUserIds.includes(user.userId)
      && (user.nickname.toLowerCase().includes(keyword.toLowerCase())
        || user.email.includes(keyword.toLowerCase()))
  })
  const divRef = useRef();
  const inputRef = useRef();

  const addChannelUser = async (e, user) => {
    await dispatch(channelActions.addChannelUser(activeChannelId, user.userId))
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
        <span># {activeChannel.name}</span>
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
          onChange={(e) => {
            setKeywork(e.target.value)
            if (e.target.value) {
              setShowResult(true)
            }
          }}
          onFocus={() => setShowResult(true)}
        />
      </div>
      <div
        id="join-channel_search-result"
        className={keyword && showResult ? "" : "hidden"}
        ref={divRef}
      >
        {availableUsers.map((user, i) => {
          return (
            <div key={user.id} className="join-channel_user">
              <div>
                <img src={user.profileImageUrl} alt="profile_image" />
                <span>{user.nickname} ({user.email})</span>
              </div>
              <button
                onClick={(e) => addChannelUser(e, user)}
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
