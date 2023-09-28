import { useModal } from "../../context/Modal"
import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getChannelMessages } from "../../store/messages";
import { ScrollContainer } from "../ScrollContainer";
import "./Message.css"
import { JoinChannel } from "../JoinChannel";
import parse from "html-react-parser";
import { CKEditor } from '@ckeditor/ckeditor5-react';
import Editor from 'ckeditor5-custom-build/build/ckeditor';


export function Message({ channel, editorHeight }) {
  const dispatch = useDispatch()
  const messages = useSelector((state) => state.messages)
  const channelMessages = messages?.channelMessages
  const { setModalContent } = useModal()
  const [showEditor, setShowEditor] = useState(false)
  const [editorId, setEditorId] = useState(null)

  return (
    <>
      <div id="message_container">
        <ScrollContainer id={channel.id} editorHeight={editorHeight}>
          <div
            id="message_intro"
            style={{ borderColor: channelMessages && Object.values(channelMessages).length ? "lightgray" : "transparent" }}
          >
            <h1>🥳 Welcome to the # {channel.name} channel</h1>
            <p>{channel.description}</p>
            {
              channel.name !== "general" &&
              <button
                onClick={() => setModalContent(<JoinChannel />)}
              >
                <i className="fa-solid fa-user-plus" />
                Add People
              </button>
            }
          </div>
          {
            channelMessages && Object.values(channelMessages).map(message => {
              return (
                <div className={`message_message-body${message.systemMessage ? " message_system-message" : ""}`} key={message.id}>
                  <img src={message.sender.profileImageUrl || "/images/profile_images/profile_images_1.png"} alt="profile_image" />
                  <div>
                    <span className="message_sender">{message.sender.nickname || message.sender.email + " (not in workspace)"}</span>
                    <span>{new Date(message.createdAt).toLocaleString()}</span>
                  </div>
                  <span className={showEditor && editorId === message.id ? "hidden" : ""}>{parse(message.content)}</span>
                  {/* <button
                    onClick={(e) => {
                      setShowEditor(true)
                      setEditorId(message.id)
                    }}
                    id="edit"
                  >
                    Edit
                  </button> */}
                  <div className={showEditor && editorId === message.id ? "" : "hidden"} id="message_editor">
                    <CKEditor
                      editor={Editor}
                      data={message.content}
                      config={{
                        placeholder: "Edit message",
                      }}

                    />
                  </div>
                </div>

              )
            })
          }
        </ScrollContainer>
      </div>
    </>
  )
}
