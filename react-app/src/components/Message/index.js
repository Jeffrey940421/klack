import { useModal } from "../../context/Modal"
import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getChannelMessages } from "../../store/messages";
import { ScrollContainer } from "../ScrollContainer";
import "./Message.css"

export function Message({ channel }) {
  const dispatch = useDispatch()
  const messages = useSelector((state) => state.messages)
  const channelMessages = messages?.channelMessages

  return (
    <>
      <div id="message_container">
        <ScrollContainer id={channel.id}>
          <div
            id="message_intro"
            style={{borderColor: channelMessages && Object.values(channelMessages).length ? "lightgray" : "transparent"}}
          >
            <h1>🥳 Welcome to the # {channel.name} channel</h1>
            <p>{channel.description}</p>
            {
              channel.name !== "general" &&
              <button>
                <i className="fa-solid fa-user-plus" />
                Add People
              </button>
            }
          </div>
          {
            channelMessages && Object.values(channelMessages).map(message => {
              return (
                <div className="message_message-body" key={message.id}>
                  <img src={message.sender.profileImageUrl || "/images/profile_images/profile_images_1.png"} alt="profile_image" />
                  <div>
                    <span className="message_sender">{message.sender.nickname || message.sender.email + " (not in workspace)"}</span>
                    <span>{new Date(message.createdAt).toLocaleString()}</span>
                  </div>
                  <span>{message.content}</span>
                </div>

              )
            })
          }
        </ScrollContainer>
      </div>
    </>
  )
}
