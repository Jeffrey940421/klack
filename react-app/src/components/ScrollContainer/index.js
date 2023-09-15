import React, { useEffect, useState, useRef, useCallback } from "react";
import "./ScrollContainer.css"

export function ScrollContainer({ children, id }) {
  const outerDiv = useRef(null);
  const innerDiv = useRef(null);
  const [prevId, setPrevId] = useState("")
  const prevInnerDivHeight = useRef(null);

  const [showScrollButton, setShowScrollButton] = useState(false);

  const scroll = async () => {
    setTimeout(() => {
      if (id !== prevId) {
        prevInnerDivHeight.current = null
      }
      const outerDivHeight = outerDiv.current?.clientHeight;
      const innerDivHeight = innerDiv.current?.clientHeight;
      const outerDivScrollTop = outerDiv.current?.scrollTop;
      if (
        !prevInnerDivHeight.current ||
        outerDivScrollTop === prevInnerDivHeight.current - outerDivHeight
      ) {
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

  useEffect(() => {
    const scrollEvent = window.addEventListener("resize", scroll)
    return (() => {
      window.removeEventListener("resize", scrollEvent)
    })
  }, [])

  useEffect(() => {
    scroll()
  }, [children]);

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
        style={{
          position: "absolute",
          backgroundColor: "red",
          color: "white",
          left: "50%",
          transform: "translateX(-50%)",
          opacity: showScrollButton ? 1 : 0,
          pointerEvents: showScrollButton ? "auto" : "none",
        }}
        onClick={handleScrollButtonClick}
      >
        New message!
      </button>
    </div>
  );
}
