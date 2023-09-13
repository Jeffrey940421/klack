import { useModal } from "../../context/Modal"
import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CreateChannel } from "../CreateChannel";
import { removeChannel, leaveCurrentChannel } from "../../store/channels";
import { authenticate } from "../../store/session";
import { ChannelDetails } from "../ChannelDetails";
import { JoinChannel } from "../JoinChannel";

export function ChannelWindow({ channel }) {
  const { setModalContent } = useModal();
  const [showChannelMenu, setShowChannelMenu] = useState(false)
  const ulRef = useRef();
  const dispatch = useDispatch()
  const user = useSelector((state) => state.session.user)
  const workspace = useSelector((state) => state.workspaces.activeWorkspace)

  const openChannelMenu = () => {
    setShowChannelMenu((prev) => !prev);
  };

  const deleteChennel = async () => {
    setShowChannelMenu(false)
    await dispatch(removeChannel(channel.id))
    await dispatch(authenticate())
  }

  const leaveChannel = async () => {
    setShowChannelMenu(false)
    await dispatch(leaveCurrentChannel(channel.id))
    await dispatch(authenticate())
  }

  useEffect(() => {
    if (!showChannelMenu) return;

    const closeChannelMenu = (e) => {
      if (ulRef.current && !ulRef.current.contains(e.target)) {
        setShowChannelMenu(false);
      }
    };

    document.addEventListener("click", closeChannelMenu);

    return () => document.removeEventListener("click", closeChannelMenu);
  }, [showChannelMenu]);

  return (
    <div id="channel-window_container">
      <div id="channel-window_background">
        <div id="channel-window_header">
          <div
            id="channel-window_title"
            onClick={openChannelMenu}
          >
            <i className="fa-solid fa-hashtag" />
            <h3>{channel?.name}</h3>
            <i className="fa-solid fa-angle-down" />
          </div>
          <div id="channel-window_members">
            <img src={channel?.creator.profileImageUrl} alt="member" />
            <span>{channel?.users && Object.values(channel.users)?.length}</span>
          </div>
          <ul id="channel-window_channel-dropdown" className={showChannelMenu ? "" : "hidden"} ref={ulRef}>
            {
              user?.id === channel?.creator.id &&
              <li
                onClick={() => {
                  setModalContent(<CreateChannel type="edit" channel={channel} workspace={workspace} />)
                  setShowChannelMenu(false)
                }}
              >
                Edit Channel
              </li>
            }
            {
              channel?.name !== "general" &&
              <li
                onClick={() => {
                  setModalContent(<JoinChannel channel={channel} workspace={workspace} />)
                  setShowChannelMenu(false)
                }}
              >
                Add People to Channel
              </li>
            }
            <li
              onClick={() => {
                setModalContent(<ChannelDetails channel={channel} defaultMenu="about" />)
                setShowChannelMenu(false)
              }}
            >
              Channel Details
            </li>
            {
              channel?.name !== "general" ?
                user?.id === channel?.creator.id ?
                  <>
                    <hr></hr>
                    <li
                      id="channel-window_delete-channel"
                      onClick={deleteChennel}
                    >
                      Delete Channel
                    </li>
                  </> :
                  <>
                    <hr></hr>
                    <li
                      id="channel-window_leave-channel"
                      onClick={leaveChannel}
                    >
                      Leave Channel
                    </li>
                  </> :
                null
            }
          </ul>
        </div>
        <hr></hr>
      </div>
    </div>
  )
}
