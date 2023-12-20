import { createContext, useState, useContext } from "react";

const ThreadContext = createContext();

export function ThreadProvider(props) {
  const [showThread, setShowThread] = useState(false)
  const [messageId, setMessageId] = useState(null)
  const [scrollMessage, setScrollMessage] = useState(false)
  const [prevScrollDivHeight, setPrevScrollDivHeight] = useState(0)

  return (
    <ThreadContext.Provider value={{showThread, setShowThread, messageId, setMessageId, scrollMessage, setScrollMessage, prevScrollDivHeight, setPrevScrollDivHeight}}>
      {props.children}
    </ThreadContext.Provider>
  )
}

export function useThread() {
  return useContext(ThreadContext)
}
