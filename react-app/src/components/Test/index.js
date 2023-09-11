import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { io } from 'socket.io-client';

let socket

export function Test() {
  const sessionUser = useSelector((state) => state.session.user);
  const [message, setMessage] = useState("")

  useEffect(() => {
    socket = io();
    console.log("connected to dms socket")
    socket.on("join_workspace", (data) => {
      setMessage(`User ${data.id} has joined`)
    })
    return (() => {
      socket.disconnect()
    })
  }, [])

  useEffect(() => {
    if (sessionUser) {
      socket.emit("join_room", {room: `user${sessionUser.id}`})
    }
  }, [sessionUser])

  if (sessionUser) {

  }

  return (
    <h1>{message}</h1>
  )
}
