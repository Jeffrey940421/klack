import React, { useEffect, useState, useRef, useCallback } from "react";
import "./ScrollContainer.css"
import { useSelector } from "react-redux";

export function ScrollContainer({ children, id }) {
  const outerDiv = useRef(null);
  const innerDiv = useRef(null);
  const [prevId, setPrevId] = useState("")
  const prevInnerDivHeight = useRef(null);
  const messages = useSelector((state) => state.messages)
  const channelMessages = messages?.channelMessages

  const [showScrollButton, setShowScrollButton] = useState(false);

  const scroll = async () => {
    setTimeout(() => {
      if (id !== prevId) {
        prevInnerDivHeight.current = null
      }
      const outerDivHeight = outerDiv.current?.clientHeight;
      const innerDivHeight = innerDiv.current?.clientHeight;
      const outerDivScrollTop = outerDiv.current?.scrollTop;
      console.log(outerDivScrollTop, prevInnerDivHeight.current, outerDivHeight)

      if (!prevInnerDivHeight.current
        || outerDivScrollTop === prevInnerDivHeight.current - outerDivHeight
        || outerDivScrollTop === prevInnerDivHeight.current - outerDivHeight - 62
        || outerDivScrollTop === prevInnerDivHeight.current - outerDivHeight + 62
        || outerDivScrollTop == 0) {
        outerDiv.current?.scrollTo({
          top: innerDivHeight - outerDivHeight,
          left: 0,
          behavior: prevInnerDivHeight.current ? "smooth" : "auto",
        });
      } else {
        setShowScrollButton(true);
      }

      prevInnerDivHeight.current = innerDivHeight;
      setPrevId(id)
    }, 100)
  }

  const handleButton = () => {
    const outerDivHeight = outerDiv.current?.clientHeight;
    const innerDivHeight = innerDiv.current?.clientHeight;
    const outerDivScrollTop = outerDiv.current?.scrollTop;

    if (outerDivScrollTop === innerDivHeight - outerDivHeight) {
      setShowScrollButton(false);
    }
  }

  useEffect(() => {
    const resizeEvent = window.addEventListener("resize", scroll)
    const scrollEvent = document.querySelector("#scroll_outer").addEventListener("scroll", handleButton)
    return (() => {
      window.removeEventListener("resize", resizeEvent)
      document.querySelector("#scroll_outer")?.removeEventListener("scroll", handleButton)
    })
  }, [])

  useEffect(() => {
    scroll()
  }, [Object.values(channelMessages).length, id]);

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
