import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Redirect } from "react-router-dom";
import Navigation from "../Navigation";
import { NoWorkspace } from "../NoWorkspace"
import { ChatRoom } from "./ChatRoom";
import { io } from 'socket.io-client';
import { Loader } from "../Loader";
import { usePopup } from "../../context/Popup";
import * as sessionActions from "../../store/session";
import * as workspaceActions from "../../store/workspaces";
import * as channelActions from "../../store/channels";
import * as messageActions from "../../store/messages";
import * as userActions from "../../store/users";
import { useSocket } from "../../context/SocketContext";

export function MainPage() {
  const dispatch = useDispatch();
  const { setPopupContent, closePopup } = usePopup()
  const sessionUser = useSelector((state) => state.session.user);
  const sessionUserId = sessionUser ? sessionUser.id : null;
  const workspaces = useSelector((state) => state.workspaces.workspaceList);
  const channels = useSelector((state) => state.channels.channelList);
  const [isLoaded, setIsLoaded] = useState(false)
  const [socketCreated, setSocketCreated] = useState(false)
  const { socketConnection, setSocketConnection, channelRooms, setChannelRooms, workspaceRooms, setWorkspaceRooms } = useSocket()

  // Load workspaces, channels, messages, and users associated with the user
  useEffect(() => {
    const initialize = async () => {
      setPopupContent(<Loader text="Building Office ..." />)
      await dispatch(sessionActions.listReceivedInvitations())
      await dispatch(sessionActions.listSentInvitations())
      const workspaces = await dispatch(workspaceActions.listWorkspaces())
      let activeWorkspaceId = sessionUser.activeWorkspaceId
      let activeWorkspace = workspaces.find(workspace => workspace.id === activeWorkspaceId)
      const channels = await dispatch(channelActions.listChannels())
      await dispatch(messageActions.listMessages())
      await dispatch(userActions.listUsers())
      // If the user has no active workspace or the active workspace is not in the workspace list, set the first workspace in the list as the active workspace
      if (!activeWorkspace && workspaces.length) {
        await dispatch(sessionActions.setActiveWorkspace(sessionUser.id, workspaces[0].id))
        activeWorkspaceId = workspaces[0].id
        activeWorkspace = workspaces[0]
      }
      // If the user has the active workspace, but the active workspace has no active channel, set the first channel in the workspace as the active channel
      // If the active workspace has the active channel, reset the active channel to update the last viewed time
      if (activeWorkspace) {
        if (!activeWorkspace.activeChannelId) {
          const activeChannel = channels.find(channel => channel.workspaceId === activeWorkspaceId)
          await dispatch(workspaceActions.setActiveChannel(activeWorkspaceId, activeChannel.id))
        } else {
          const activeChannel = channels.find(channel => channel.id === activeWorkspace.activeChannelId)
          const data = await dispatch(workspaceActions.setActiveChannel(activeWorkspaceId, activeChannel.id))
          if (!Array.isArray(data)) {
            const prevActiveChannel = data.prevActiveChannel
            await dispatch(channelActions.addChannel(prevActiveChannel))
          }
        }
      }
      setIsLoaded(true)
      closePopup()
    }

    if (sessionUser) {
      initialize()
    }

    return (() => {
      setIsLoaded(false)
    })
  }, [dispatch, sessionUserId])


  // Create socket connection and join user room
  useEffect(() => {
    const socket = io();
    setSocketConnection(socket)
    setSocketCreated(true)
    if (sessionUser && isLoaded) {
      socket.emit("join_room", { rooms: [`user${sessionUser.id}`] })
    }

    return (() => {
      if (socketCreated) {
        socket.disconnect()
        setSocketConnection(null)
        setSocketCreated(false)
      }
    })
  }, [sessionUserId, isLoaded])

  // Join workspace rooms
  useEffect(() => {
    if (isLoaded && socketCreated) {
      const rooms = Object.values(workspaces).map(workspace => `workspace${workspace.id}`)
      socketConnection.emit("join_room", { rooms })
      setWorkspaceRooms(rooms)
    }

    return (() => {
      if (socketCreated) {
        socketConnection.emit("leave_room", { rooms: workspaceRooms })
      }
    })
  }, [workspaces, isLoaded, socketCreated, socketConnection])


  // Join channel rooms
  useEffect(() => {
    if (isLoaded && socketCreated) {
      const rooms = Object.values(channels).map(channel => `channel${channel.id}`)
      socketConnection.emit("join_room", { rooms })
      setChannelRooms(rooms)
    }

    return (() => {
      if (socketCreated) {
        socketConnection.emit("leave_room", { rooms: channelRooms })
      }
    })
  }, [channels, isLoaded, socketCreated, socketConnection])


  if (!sessionUser) {
    return <Redirect to="/login" />
  } else {
    if (!isLoaded || !socketCreated) {
      return null
    } else {
      return (
        <div className="main-page_container">
          <Navigation />
          {
            Object.values(workspaces).length ?
              <ChatRoom /> :
              <NoWorkspace />
          }
        </div>
      )
    }
  }
}
