import { useModal } from "../../context/Modal"
import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

export function ChannelDetails({ channel, defaultMenu }) {
  const dispatch = useDispatch()
  const [menu, setMenu] = useState(defaultMenu)
  const [keyword, setKeyword] = useState("")
  const channelUsers = Object.values(channel.users)
  const foundUsers = channelUsers.filter(user => user.nickname.toLowerCase().includes(keyword.toLowerCase()) || user.email.includes(keyword.toLowerCase()))

  return (
    <div id="channel-details_container">
      <h3>Channel Details</h3>
      <div id="channel-detail_selection">
        <span
          className={`${menu === "about" ? "active-selection" : ""}`}
          onClick={() => setMenu("about")}
        >
          About
        </span>
        <span
          className={`${menu === "members" ? "active-selection" : ""}`}
          onClick={() => setMenu("members")}
        >
          Members {Object.values(channel.users).length}
        </span>
      </div>
      {
        menu === "about" &&
        <div id="channel-detail_about">
          <div>
            <h3>Name</h3>
            <span><i className="fa-solid fa-hashtag" />{channel.name}</span>
          </div>
          <div>
            <h3>Description</h3>
            <span>{channel.description}</span>
          </div>
          <div>
            <h3>Created by</h3>
            <span>{channel.creator.nickname} on {new Date(channel.createdAt).toLocaleString('en-us', { year: 'numeric', month: 'long', day: '2-digit' })}</span>
          </div>
        </div>
      }
      {
        menu === "members" &&
        <div id="channel-detail_members">
          <input
            type="text"
            placeholder="Find members"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <div id="channel-detail_search-result">
            {foundUsers.map(user => {
              return (
                <div>
                  <img src={user.profileImageUrl} alt="profile_image" />
                  <span>{user.nickname} ({user.email})</span>
                </div>
              )
            })}
            {!foundUsers.length && <span id="join-channel_no-result">No matches found for <b>{keyword}</b></span>}
          </div>
        </div>
      }
    </div>
  )
}
