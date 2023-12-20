import { createContext, useState, useContext } from "react";

const SocketContext = createContext();

export function SocketProvider(props) {
  const [socketConnection, setSocketConnection] = useState(null)
  const [channelRooms, setChannelRooms] = useState([])
  const [workspaceRooms, setWorkspaceRooms] = useState([])
  return (
    <SocketContext.Provider value={{socketConnection, setSocketConnection, channelRooms, setChannelRooms, workspaceRooms, setWorkspaceRooms}}>
      {props.children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
