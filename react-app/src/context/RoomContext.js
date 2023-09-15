import { createContext, useState, useContext } from "react";

const RoomContext = createContext();

export function RoomProvider(props) {
  const [channelRooms, setChannelRooms] = useState([])
  const [workspaceRooms, setWorkspaceRooms] = useState([])
  return (
    <RoomContext.Provider value={{channelRooms, setChannelRooms, workspaceRooms, setWorkspaceRooms}}>
      {props.children}
    </RoomContext.Provider>
  )
}

export function useRoom() {
  return useContext(RoomContext)
}
