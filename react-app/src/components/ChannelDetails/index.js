import { useModal } from "../../context/Modal"
import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./ChannelDetails.css"

export function ChannelDetails({ defaultMenu }) {
  const dispatch = useDispatch()
  const [menu, setMenu] = useState(defaultMenu)
  const [keyword, setKeyword] = useState("")
  const channel = useSelector((state) => state.channels.activeChannel)
  const channelUsers = Object.values(channel.users)
  const foundUsers = channelUsers.filter(user => user.nickname.toLowerCase().includes(keyword.toLowerCase()) || user.email.includes(keyword.toLowerCase()))

  return (
    <div id="channel-detail_container">
      <div id="channel-detail_header">
        <i className="fa-solid fa-hashtag" />
        <h3>{channel.name}</h3>
      </div>
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
            <h3>Channel Name</h3>
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
          <i className="fa-solid fa-magnifying-glass" />
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
            {!foundUsers.length && <span id="channel-detail_no-result">No matches found for <b>{keyword}</b></span>}
          </div>
        </div>
      }
    </div>
  )
}
