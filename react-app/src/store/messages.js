const LOAD_CHANNEL_MESSAGES = "messages/LOAD_CHANNEL_MESSAGES"
const LOAD_WORKSPACE_MESSAGES = "messages/LOAD_WORKSPACE_MESSAGES"
const ADD_CHANNEL_MESSAGE = "messages/ADD_CHANNEL_MESSAGE"
const ADD_WORKSPACE_MESSAGE = "messages/ADD_WORKSPACE_MESSAGE"

const loadChannelMessages = (messages) => ({
  type: LOAD_CHANNEL_MESSAGES,
  payload: messages
})

const loadWorkspaceMessages = (messages) => ({
  type: LOAD_WORKSPACE_MESSAGES,
  payload: messages
})

export const addChannelMessage = (message) => ({
  type: ADD_CHANNEL_MESSAGE,
  payload: message
})

export const addWorkspaceMessage = (message) => ({
  type: ADD_WORKSPACE_MESSAGE,
  payload: message
})

const initialState = { channelMessages: {}, workspaceMessages: {} };

export const getChannelMessages = (id) => async (dispatch) => {
  const response = await fetch(`api/channels/${id}/messages`, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(loadChannelMessages(data.messages));
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

export const getWorkspaceMessages = (id) => async (dispatch) => {
  const response = await fetch(`api/workspaces/${id}/messages`, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(loadWorkspaceMessages(data.messages));
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
    await dispatch(addChannelMessage(data));
    await dispatch(addWorkspaceMessage(data));
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

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case LOAD_CHANNEL_MESSAGES: {
      const messages = {}
      for (let message of action.payload) {
        messages[message.id] = message
      }
      return { ...state, channelMessages: messages };
    }
    case LOAD_WORKSPACE_MESSAGES: {
      const messages = {}
      for (let message of action.payload) {
        if (!messages[message.channelId]) {
          messages[message.channelId] = { [message.id]: message }
        } else {
          messages[message.channelId][message.id] = message
        }
      }
      return { ...state, workspaceMessages: messages };
    }
    case ADD_CHANNEL_MESSAGE: {
      return {
        ...state,
        channelMessages: {
          ...state.channelMessages,
          [action.payload.id]: action.payload
        }
      }
    }
    case ADD_WORKSPACE_MESSAGE: {
      return {
        ...state,
        workspaceMessages: {
          ...state.workspaceMessages,
          [action.payload.channelId]: state.workspaceMessages[action.payload.channelId] ?
            {
              ...state.workspaceMessages[action.payload.channelId],
              [action.payload.id]: action.payload
            } :
            { [action.payload.id]: action.payload }
        }
      }
    }
    default:
      return state;
  }
}
