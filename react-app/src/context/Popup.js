import React, { useRef, useState, useContext } from "react";
import ReactDOM from "react-dom";
import "./Popup.css";

const PopupContext = React.createContext();

export function PopupProvider({ children }) {
  const ref = useRef();
  const [popupContent, setPopupContent] = useState(null);

  const closePopup = () => {
    setPopupContent(null);
  };

  const contextValue = {
    ref,
    popupContent,
    setPopupContent,
    closePopup,
  };

  return (
    <>
      <PopupContext.Provider value={contextValue}>
        {children}
      </PopupContext.Provider>
      <div ref={ref} />
    </>
  );
}

export function Popup() {
  const { ref, popupContent, closePopup } = useContext(PopupContext);
  if (!ref || !ref.current || !popupContent) return null;

  return ReactDOM.createPortal(
    <div id="popup">
      <div id="popup-background" />
      <div id="popup-content">{popupContent}</div>
    </div>,
    ref.current
  );
}


export const usePopup = () => useContext(PopupContext);
