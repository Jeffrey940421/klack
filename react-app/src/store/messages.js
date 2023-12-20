const LOAD_MESSAGES = "messages/LOAD_MESSAGES"
const ADD_MESSAGES = "messages/ADD_MESSAGES"
const ADD_MESSAGE = "messages/ADD_MESSAGE"
const DELETE_MESSAGE = "messages/DELETE_MESSAGE"
const DELETE_CHANNEL_MESSAGES = "messages/DELETE_CHANNEL_MESSAGES"
const DELETE_WORKSPACE_MESSAGES = "messages/DELETE_WORKSPACE_MESSAGES"
const ADD_REPLY = "messages/ADD_REPLY"
const DELETE_REPLY = "messages/DELETE_REPLY"

const loadMessages = (messages) => ({
  type: LOAD_MESSAGES,
  payload: messages
})

export const addMessages = (messages) => ({
  type: ADD_MESSAGES,
  payload: messages
})

export const addMessage = (message) => ({
  type: ADD_MESSAGE,
  payload: message
})

export const deleteMessage = (message) => ({
  type: DELETE_MESSAGE,
  payload: message
})

export const deleteChannelMessages = (channelId) => ({
  type: DELETE_CHANNEL_MESSAGES,
  payload: channelId
})

export const deleteWorkspaceMessages = (workspaceId) => ({
  type: DELETE_WORKSPACE_MESSAGES,
  payload: workspaceId
})

export const addReply = (reply) => ({
  type: ADD_REPLY,
  payload: reply
})

export const deleteReply = ({replyId, messageId}) => ({
  type: DELETE_REPLY,
  payload: {replyId, messageId}
})

const initialState = { messageList: {}, organizedMessages: {} };

export const listMessages = () => async (dispatch) => {
  const response = await fetch("/api/messages/current");
  if (response.ok) {
    const data = await response.json();
    dispatch(loadMessages(data.messages));
  } else if (response.status < 500) {
    const data = await response.json();
    if (data.errors) {
      return data.errors;
    }
  } else {
    return ["An error occurred. Please try again."];
  }
}

export const getChannelMessages = (id, startPage, pageNum) => async (dispatch) => {
  for (let i = 0; i < pageNum; i += 1) {
    const response = await fetch(`/api/channels/${id}/messages?page=${startPage + i}`);
    if (response.ok) {
      const data = await response.json();
      dispatch(addMessages(data.messages));
    } else if (response.status < 500) {
      const data = await response.json();
      if (data.errors) {
        return data.errors;
      }
    } else {
      return ["An error occurred. Please try again."];
    }
  }
}

export const createMessage = (id, content) => async (dispatch) => {
  const response = await fetch(`api/channels/${id}/messages/new`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content
    })
  });
  if (response.ok) {
    const data = await response.json();
    await dispatch(addMessage(data.message));
    return data;
  } else if (response.status < 500) {
    const data = await response.json();
    if (data.errors) {
      return data.errors;
    }
  } else {
    return ["An error occurred. Please try again."];
  }
}

export const editMessage = (id, content) => async (dispatch) => {
  const response = await fetch(`api/messages/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content
    })
  });
  if (response.ok) {
    const data = await response.json();
    await dispatch(addMessage(data.message));
    return null;
  } else if (response.status < 500) {
    const data = await response.json();
    if (data.errors) {
      return data.errors;
    }
  } else {
    return ["An error occurred. Please try again."];
  }
}

export const removeMessage = (id) => async (dispatch) => {
  const response = await fetch(`api/messages/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    await dispatch(deleteMessage({
      id: data.messageId,
      channelId: data.channel.id
    }));
    return data;
  } else if (response.status < 500) {
    const data = await response.json();
    if (data.errors) {
      return data.errors;
    }
  } else {
    return ["An error occurred. Please try again."];
  }
}

export const createReply = (id, reply) => async (dispatch) => {
  const response = await fetch(`api/messages/${id}/replies/new`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "content": reply
    })
  });
  if (response.ok) {
    const data = await response.json();
    await dispatch(addReply(data.reply));
    return null;
  } else if (response.status < 500) {
    const data = await response.json();
    if (data.errors) {
      return data.errors;
    }
  } else {
    return ["An error occurred. Please try again."];
  }
}

export const editReply = (id, reply) => async (dispatch) => {
  const response = await fetch(`api/replies/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "content": reply
    })
  });
  if (response.ok) {
    const data = await response.json();
    await dispatch(addReply(data.reply));
    return null;
  } else if (response.status < 500) {
    const data = await response.json();
    if (data.errors) {
      return data.errors;
    }
  } else {
    return ["An error occurred. Please try again."];
  }
}

export const removeReply = (id) => async (dispatch) => {
  const response = await fetch(`api/replies/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    await dispatch(deleteReply({
      replyId: data.replyId,
      messageId: data.messageId
    }));
    return null;
  } else if (response.status < 500) {
    const data = await response.json();
    if (data.errors) {
      return data.errors;
    }
  } else {
    return ["An error occurred. Please try again."];
  }
}

function normalize(state) {
  const newState = {}
  state.forEach(record => {
    newState[record.id] = record
  })
  return newState
}

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case LOAD_MESSAGES: {
      const organizedMessages = {}
      for (let message of action.payload) {
        if (message.channelId in organizedMessages) {
          organizedMessages[message.channelId].push(message.id)
        } else {
          organizedMessages[message.channelId] = [message.id]
        }
      }
      return { ...state, messageList: normalize(action.payload), organizedMessages };
    }
    case ADD_MESSAGES: {
      const organizedMessages = { ...state.organizedMessages }
      for (let i = action.payload.length - 1; i >= 0; i -= 1) {
        const message = action.payload[i]
        if (message.channelId in organizedMessages) {
          if (!organizedMessages[message.channelId].includes(message.id)) {
            organizedMessages[message.channelId].unshift(message.id)
          }
        } else {
          organizedMessages[message.channelId] = [message.id]
        }
      }
      return { ...state, messageList: { ...state.messageList, ...normalize(action.payload) }, organizedMessages };
    }
    case ADD_MESSAGE: {
      const organizedMessages = { ...state.organizedMessages }
      if (action.payload.channelId in organizedMessages) {
        if (!organizedMessages[action.payload.channelId].includes(action.payload.id)) {
          organizedMessages[action.payload.channelId].unshift(action.payload.id)
        }
      } else {
        organizedMessages[action.payload.channelId] = [action.payload.id]
      }
      return { ...state, messageList: { ...state.messageList, [action.payload.id]: action.payload }, organizedMessages };
    }
    case DELETE_MESSAGE: {
      const organizedMessages = { ...state.organizedMessages }
      const messageList = { ...state.messageList }
      if (action.payload.channelId in organizedMessages) {
        if (organizedMessages[action.payload.channelId].includes(action.payload.id)) {
          const index = organizedMessages[action.payload.channelId].indexOf(action.payload.id)
          organizedMessages[action.payload.channelId].splice(index, 1)
        }
      }
      delete messageList[action.payload.id]
      return { ...state, messageList, organizedMessages };
    }
    case DELETE_CHANNEL_MESSAGES: {
      const organizedMessages = { ...state.organizedMessages }
      const messageList = { ...state.messageList }
      for (let messageId of organizedMessages[action.payload]) {
        delete messageList[messageId]
      }
      delete organizedMessages[action.payload]
      return { ...state, messageList, organizedMessages };
    }
    case DELETE_WORKSPACE_MESSAGES: {
      const organizedMessages = { ...state.organizedMessages }
      const messageList = { ...state.messageList }
      for (let channelId in organizedMessages) {
        let inWorkspace = false
        for (let messageId of organizedMessages[channelId]) {
          if (messageList[messageId].workspaceId === action.payload) {
            inWorkspace = true
            delete messageList[messageId]
          }
        }
        if (inWorkspace) {
          delete organizedMessages[channelId]
        }
        inWorkspace = false
      }
      return { ...state, messageList, organizedMessages };
    }
    case ADD_REPLY: {
      const messageList = { ...state.messageList }
      const message = messageList[action.payload.messageId]
      message.replies = {
        ...message.replies,
        [action.payload.id]: action.payload
      }
      return { ...state, messageList };
    }
    case DELETE_REPLY: {
      const messageList = { ...state.messageList }
      const message = messageList[action.payload.messageId]
      delete message.replies[action.payload.replyId]
      return { ...state, messageList };
    }
    default:
      return state;
  }
}
