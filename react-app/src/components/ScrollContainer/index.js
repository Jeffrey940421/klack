import React, { useEffect, useState, useRef, useCallback } from "react";
import { useThread } from "../../context/ThreadContext";
import * as messageActions from "../../store/messages";
import "./ScrollContainer.css"
import { useSelector, useDispatch } from "react-redux";

export function ScrollContainer({ children, editorHeight, setEditorHeight, editorObj, editorId, showEditor }) {
  const dispatch = useDispatch();
  const outerDiv = useRef(null);
  const innerDiv = useRef(null);
  const [prevId, setPrevId] = useState("")
  const [prevInnerDivHeight, setPrevInnerDivHeight] = useState("");
  const [prevOuterDivHeight, setPrevOuterDivHeight] = useState("");
  const [prevOuterDivScrollTop, setPrevOuterDivScrollTop] = useState("");
  const sessionUser = useSelector((state) => state.session.user);
  const activeWorkspaceId = sessionUser.activeWorkspaceId;
  const workspaces = useSelector((state) => state.workspaces.workspaceList);
  const activeWorkspace = workspaces[activeWorkspaceId];
  const channels = useSelector((state) => state.channels.channelList);
  const activeChannelId = activeWorkspace.activeChannelId;
  const activeChannel = channels[activeChannelId];
  const messages = useSelector((state) => state.messages.messageList);
  const organizedMessages = useSelector((state) => state.messages.organizedMessages);
  const channelMessageIds = activeChannelId ? organizedMessages[activeChannelId] : [];
  const lastMessageId = channelMessageIds ? channelMessageIds[0] : null;
  const [prevLastMessageId, setPrevLastMessageId] = useState(null);
  const [prevEditorId, setPrevEditorId] = useState(null);
  const [prevShowEditor, setPrevShowEditor] = useState(false);
  const channelMessages = channelMessageIds ? channelMessageIds.map(id => messages[id]).reverse() : [];
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const bottomRef = useRef()
  const buttonRef = useRef()
  const { showThread, scrollMessage, setScrollMessage, prevScrollDivHeight, setPrevScrollDivHeight } = useThread()

  const scrollAfterDelay = async (delay = 0) => {
    const outerDivHeight = outerDiv.current?.clientHeight;
    const innerDivHeight = innerDiv.current?.clientHeight;
    const outerDivScrollTop = outerDiv.current?.scrollTop;

    if (
      bottomRef.current
      // If the user switched the channel, was already at the bottom of the channel
      // when the new message was received, or user is the message sender, scroll
      // the channel to the bottom automatically
      && (activeChannelId !== prevId
        || prevInnerDivHeight - prevOuterDivHeight - prevOuterDivScrollTop < 1
        || (activeChannelId === prevId
          && channelMessages[channelMessages.length - 1].senderId === sessionUser.id
          && lastMessageId > prevLastMessageId))
    ) {
      await setTimeout(() => {
        const attachmentArea = document.querySelector("#channel-window_attachment-preview")
        const attachmentAreaHeight = attachmentArea ? attachmentArea.offsetHeight : 0
        if (editorObj) setEditorHeight(editorObj.ui.view.element.offsetHeight + attachmentAreaHeight)
        bottomRef.current.scrollIntoView({
          behavior: activeChannelId === prevId ? "smooth" : "auto"
        })
      }, delay);
    } else {
      // Otherwise, if a new message is received, show the scroll button
      if (lastMessageId > prevLastMessageId) {
        setShowScrollButton(true);
      }
    }

    setPrevOuterDivHeight(outerDivHeight);
    setPrevOuterDivScrollTop(outerDivScrollTop);
    setPrevInnerDivHeight(innerDivHeight);
    setPrevId(activeChannelId)
    setPrevLastMessageId(lastMessageId)
    setScrollMessage(false)

  }

  const scrollToMessage = async (messageId) => {
    const message = document.querySelector(`#message_${messageId}`);
    if (message) {
      message.scrollIntoView({
        behavior: "smooth",
        block: 'center'
      });
    }
  }

  // Scroll to bottom if the user was already at the bottom of the channel when the
  // new message was received
  const scroll = () => {
    const outerDivHeight = outerDiv.current?.clientHeight;
    const innerDivHeight = innerDiv.current?.clientHeight;
    const outerDivScrollTop = outerDiv.current?.scrollTop;

    if (
      bottomRef.current
      && prevInnerDivHeight - prevOuterDivHeight - prevOuterDivScrollTop < 1
    ) {
      bottomRef.current.scrollIntoView({
        behavior: "auto"
      });
    }

    setPrevOuterDivHeight(outerDivHeight);
    setPrevOuterDivScrollTop(outerDivScrollTop);
    setPrevInnerDivHeight(innerDivHeight);
    const attachmentArea = document.querySelector("#channel-window_attachment-preview")
    const attachmentAreaHeight = attachmentArea ? attachmentArea.offsetHeight : 0
    if (editorObj) setEditorHeight(editorObj.ui.view.element.offsetHeight + attachmentAreaHeight)
  }

  const handleScroll = async () => {
    const outerDivHeight = outerDiv.current?.clientHeight;
    const innerDivHeight = innerDiv.current?.clientHeight;
    const outerDivScrollTop = outerDiv.current?.scrollTop;
    const currentMessageNum = channelMessages.length;

    if (innerDivHeight - outerDivHeight - outerDivScrollTop < 1) {
      setShowScrollButton(false);
    }

    if (outerDivScrollTop < 1 && currentMessageNum < activeChannel.messageNum) {
      const startPage = Math.floor(currentMessageNum / 50) + 1;
      const firstMessage = document.querySelector(`#message_${channelMessages[0].id}`);
      if (currentMessageNum % 50 !== 0
        && currentMessageNum % 50 > 25
        && startPage * 50 < activeChannel.messageNum) {
        setIsFetching(true);
        await dispatch(messageActions.getChannelMessages(activeChannelId, startPage, 2))
      } else {
        setIsFetching(true);
        await dispatch(messageActions.getChannelMessages(activeChannelId, startPage, 1))
      }
      firstMessage?.scrollIntoView({
        behavior: "auto"
      });
    }

    setPrevOuterDivHeight(outerDivHeight);
    setPrevOuterDivScrollTop(outerDivScrollTop);
    setPrevInnerDivHeight(innerDivHeight);
    setIsFetching(false);
  }

  // Scroll the channel to the bottom when the button is clicked
  const handleScrollButtonClick = useCallback(() => {
    const outerDivHeight = outerDiv.current.clientHeight;
    const innerDivHeight = innerDiv.current.clientHeight;

    outerDiv.current.scrollTo({
      top: innerDivHeight - outerDivHeight,
      left: 0,
      behavior: "smooth",
    });

    setShowScrollButton(false);
  }, []);

  // Change the scroll flag to true when the height of outer scroll div increases and
  // the increase is not caused by showing the editor
  useEffect(() => {
    const checkHeight = async () => {
      await setTimeout(() => {
        const scrollDivHeight = scrollDiv.scrollHeight
        if (scrollDivHeight > prevScrollDivHeight && prevEditorId === editorId && prevShowEditor === showEditor) {
          setScrollMessage(true)
        }
        setPrevScrollDivHeight(scrollDivHeight)
        setPrevEditorId(editorId)
        setPrevShowEditor(showEditor)
      }, 0)
    }
    const scrollDiv = document.getElementById('scroll_outer')
    if (!scrollDiv || scrollMessage) return
    checkHeight()
  })

  useEffect(() => {
    // If the user was already at the bottom of the channel, keep the user at the bottom when scrolling
    window.addEventListener("resize", scroll)
    // If the user scrolls down to the bottom of the channel, hide the scroll button
    // If the user scrolls up to the top of the channel, load more messages
    document.querySelector("#scroll_outer").addEventListener("scroll", handleScroll)
    return (() => {
      window.removeEventListener("resize", scroll)
      document.querySelector("#scroll_outer")?.removeEventListener("scroll", handleScroll)
    })
  }, [prevInnerDivHeight, prevOuterDivHeight, prevOuterDivScrollTop, channelMessages, activeChannel, editorObj])

  useEffect(() => {
    scrollAfterDelay()
  }, [activeChannelId])

  useEffect(() => {
    // This flag changes to true when the height of outer scroll div increases
    if (scrollMessage) {
      scrollAfterDelay()
    }
  }, [scrollMessage])

  useEffect(() => {
    if (showThread) {
      scrollAfterDelay(250)
    } else {
      setTimeout(() => {
        const attachmentArea = document.querySelector("#channel-window_attachment-preview")
        const attachmentAreaHeight = attachmentArea ? attachmentArea.offsetHeight : 0
        if (editorObj) setEditorHeight(editorObj.ui.view.element.offsetHeight + attachmentAreaHeight)
      }, 250)
    }

  }, [showThread, editorObj])

  useEffect(() => {
    if (showEditor) {
      scrollToMessage(editorId)
      setPrevEditorId(editorId)
    }
  }, [editorId, showEditor])

  useEffect(() => {
    // If the user was already at the bottom of the channel, keep the user at the bottom when the
    // text editor size changes
    bottomRef.current.style.height = `${editorHeight - 108 + 165}px`;
    buttonRef.current.style.bottom = `${editorHeight - 108 + 175}px`;
    const marginBottom = `${editorHeight - 108 + 165}px`;
    const styleElement = document.createElement('style');
    styleElement.textContent = `#scroll_outer::-webkit-scrollbar-track-piece:end { margin-bottom: ${marginBottom}; }`;
    document.head.querySelectorAll('style[data-scrollbar-style]').forEach((element) => {
      element.remove();
    });
    styleElement.setAttribute('data-scrollbar-style', 'true');
    document.head.appendChild(styleElement);

    scroll()
  }, [editorHeight]);

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
      }}
    >
      <div
        ref={outerDiv}
        id="scroll_outer"
        style={{
          position: "relative",
          height: "100%",
          overflowY: "scroll",
        }}
      >
        <div
          ref={innerDiv}
          id="scroll_inner"
          style={{
            position: "relative",
          }}
        >
          <div id="scroll_loader" className={isFetching ? "" : "hidden"}>
            <i className="fa-solid fa-spinner fa-spin-pulse" />
            Loading More Messages
          </div>
          {children}
          <div ref={bottomRef} id="scroll_bottom"></div>
        </div>
      </div>
      <button
        id="scroll_button"
        style={{
          display: showScrollButton ? "flex" : "none",
          pointerEvents: showScrollButton ? "auto" : "none",
        }}
        onClick={handleScrollButtonClick}
        ref={buttonRef}
      >
        <i className="fa-solid fa-arrow-down" /> New Message
      </button>
    </div>
  );
}
