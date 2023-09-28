import React, { useEffect, useState, useRef, useCallback } from "react";
import "./ScrollContainer.css"
import { useSelector } from "react-redux";

export function ScrollContainer({ children, id, editorHeight }) {
  const outerDiv = useRef(null);
  const innerDiv = useRef(null);
  const [prevId, setPrevId] = useState("")
  const [prevInnerDivHeight, setPrevInnerDivHeight] = useState("");
  const [prevOuterDivHeight, setPrevOuterDivHeight] = useState("");
  const [prevOuterDivScrollTop, setPrevOuterDivScrollTop] = useState("");
  const messages = useSelector((state) => state.messages)
  const channelMessages = messages?.channelMessages
  const [showScrollButton, setShowScrollButton] = useState(false);
  const bottomRef = useRef()

  const scroll = () => {
    if (id !== prevId) {
      setPrevInnerDivHeight("")
    }
    const outerDivHeight = outerDiv.current?.clientHeight;
    const innerDivHeight = innerDiv.current?.clientHeight;
    const outerDivScrollTop = outerDiv.current?.scrollTop;

    if (bottomRef.current && (!prevInnerDivHeight
      || prevInnerDivHeight - prevOuterDivHeight - prevOuterDivScrollTop < 1
      || outerDivScrollTop === 0)) {
      bottomRef.current?.scrollIntoView({
        behavior: prevInnerDivHeight ? "smooth" : "auto",
      });
    } else {
      setShowScrollButton(true);
    }

    setPrevOuterDivHeight(outerDivHeight);
    setPrevOuterDivScrollTop(outerDivScrollTop);
    setPrevInnerDivHeight(innerDivHeight);
    setPrevId(id)
  }

  const scrollBottom = () => {
    const outerDivHeight = outerDiv.current?.clientHeight;
    const innerDivHeight = innerDiv.current?.clientHeight;
    const outerDivScrollTop = outerDiv.current?.scrollTop;

    if (bottomRef.current && (!prevInnerDivHeight
      || prevInnerDivHeight - prevOuterDivHeight - prevOuterDivScrollTop < 1
      || outerDivScrollTop == 0)) {
      bottomRef.current?.scrollIntoView({
        behavior: "auto",
      });
    }

    setPrevOuterDivHeight(outerDivHeight);
    setPrevOuterDivScrollTop(outerDivScrollTop);
    setPrevInnerDivHeight(innerDivHeight);
  }

  const handleButton = () => {
    const outerDivHeight = outerDiv.current?.clientHeight;
    const innerDivHeight = innerDiv.current?.clientHeight;
    const outerDivScrollTop = outerDiv.current?.scrollTop;

    if (innerDivHeight - outerDivHeight - outerDivScrollTop < 1) {
      setShowScrollButton(false);
    }

    setPrevOuterDivHeight(outerDivHeight);
    setPrevOuterDivScrollTop(outerDivScrollTop);
    setPrevInnerDivHeight(innerDivHeight);
  }

  useEffect(() => {

    window.addEventListener("resize", scrollBottom)
    document.querySelector("#scroll_outer").addEventListener("scroll", handleButton)
    return (() => {
      window.removeEventListener("resize", scrollBottom)
      document.querySelector("#scroll_outer")?.removeEventListener("scroll", handleButton)
    })
  }, [prevInnerDivHeight, prevOuterDivHeight, prevOuterDivScrollTop])

  useEffect(() => {
    scroll()
  }, [Object.values(channelMessages).length, id]);

  useEffect(() => {
    scrollBottom()
  }, [editorHeight]);

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
          {children}
          <div ref={bottomRef}></div>
        </div>
      </div>
      <button
        id="scroll_button"
        style={{
          display: showScrollButton ? "flex" : "none",
          pointerEvents: showScrollButton ? "auto" : "none",
        }}
        onClick={handleScrollButtonClick}
      >
        <i className="fa-solid fa-arrow-down" /> New Message
      </button>
    </div>
  );
}
