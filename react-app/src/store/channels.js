const LOAD_CHANNELS = "channels/LOAD_CHANNELS"
const LOAD_ACTIVE_CHANNEL = "workspaces/LOAD_ACTIVE_CHANNEL"
const ADD_CHANNEL = "channels/ADD_CHANNEL"
const DELETE_CHANNEL = "channels/DELETE_CHANNEL"
const UPDATE_CHANNEL_USER = "channels/UPDATE_CHANNEL_USER"
const REMOVE_CHANNEL_USER = "channels/REMOVE_CHANNEL_USER"
const UPDATE_ACTIVE_CHANNEL = 'channels/UPDATE_ACTIVE_CHANNEL'
const UPDATE_CHANNEL = 'channels/UPDATE_CHANNEL'
const LOAD_ALL_CHANNELS = 'channels/LOAD_ALL_CHANNELS'
const SET_CHANNEL_LAST_VIEWED = 'channels/SET_CHANNEL_LAST_VIEWED'

const loadChannels = (channels) => ({
  type: LOAD_CHANNELS,
  payload: channels
})

const loadActiveChannel = (channel) => ({
  type: LOAD_ACTIVE_CHANNEL,
  payload: channel
})

const loadAllChannels = (channels) => ({
  type: LOAD_ALL_CHANNELS,
  payload: channels
})

const addChannel = (channel) => ({
  type: ADD_CHANNEL,
  payload: channel
})

export const deleteChannel = (id, activeChannel) => ({
  type: DELETE_CHANNEL,
  payload: { id, activeChannel }
})

export const updateChannelUser = (profile) => ({
  type: UPDATE_CHANNEL_USER,
  payload: profile
})

export const removeChannelUser = (profile) => ({
  type: REMOVE_CHANNEL_USER,
  payload: profile
})

export const updateActiveChannel = (channel) => ({
  type: UPDATE_ACTIVE_CHANNEL,
  payload: channel
})

export const updateChannel = (channel) => ({
  type: UPDATE_CHANNEL,
  payload: channel
})

export const setChannelLastViewed = (channelId) => ({
  type: SET_CHANNEL_LAST_VIEWED,
  payload: channelId
})

const initialState = { channels: {}, activeChannel: null, allChannels: [] };

export const getChannels = () => async (dispatch) => {
  const response = await fetch("api/channels/current", {
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(loadChannels(data.channels));
    return data.channels;
  } else if (response.status < 500) {
    const data = await response.json();
    if (data.errors) {
      return data.errors;
    }
  } else {
    return ["An error occurred. Please try again."];
  }
}

export const getActiveChannel = (id) => async (dispatch) => {
  const response = await fetch(`api/channels/${id}`, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(loadActiveChannel(data));
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

export const getAllChannels = () => async (dispatch) => {
  const response = await fetch("api/channels/all", {
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(loadAllChannels(data.channels));
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

export const createChannel = (id, channel) => async (dispatch) => {
  const response = await fetch(`api/workspaces/${id}/channels/new`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: channel.name,
      description: channel.description
    })
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(addChannel(data));
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

export const editChannel = (id, channel) => async (dispatch) => {
  const response = await fetch(`api/channels/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: channel.name,
      description: channel.description
    })
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(addChannel(data));
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

export const removeChannel = (id) => async (dispatch) => {
  const response = await fetch(`api/channels/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(deleteChannel(id, data.activeWorkspace));
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

export const addToChannel = (channelId, userId) => async (dispatch) => {
  const response = await fetch(`api/channels/${channelId}/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(addChannel(data));
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

export const leaveCurrentChannel = (id) => async (dispatch) => {
  const response = await fetch(`api/channels/${id}/leave`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(deleteChannel(id, data.activeChannel));
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

const normalization = (payload) => {
  const messages = {}
  for (let message of payload.messages) {
    messages[message.id] = message
  }
  const users = {}
  for (let user of payload.users) {
    users[user.id] = user
  }
  return { messages, users }
}

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case LOAD_CHANNELS: {
      const channels = {}
      for (let channel of action.payload) {
        channels[channel.id] = channel
      }
      return { ...state, channels };
    }
    case LOAD_ACTIVE_CHANNEL: {
      const { messages, users } = normalization(action.payload)
      const activeChannel = {
        ...action.payload,
        messages: messages,
        users: users
      }
      return { ...state, activeChannel }
    }
    case LOAD_ALL_CHANNELS: {
      return { ...state, allChannels: action.payload }
    }
    case ADD_CHANNEL: {
      const { messages, users } = normalization(action.payload)
      const activeChannel = {
        ...action.payload,
        messages: messages,
        users: users,
      }
      const channel = {
        id: action.payload.id,
        name: action.payload.name,
        creatorId: action.payload.creator.id,
        description: action.payload.description,
        messageNum: action.payload.messages.length,
        createdAt: action.payload.createdAt,
        lastViewedAt: action.payload.lastViewedAt
      }
      let channels = Object.values(state.channels)
      let allChannels = [...state.allChannels]
      if (!allChannels.includes(channel.id)) {
        allChannels.push(channel.id)
      }
      channels.push(channel)
      channels = channels.sort((a, b) => a.id - b.id)
      const sortedChannels = {}
      for (let channel of channels) {
        sortedChannels[channel.id] = channel
      }
      return { ...state, channels: sortedChannels, activeChannel, allChannels }
    }
    case DELETE_CHANNEL: {
      let { id, activeChannel } = action.payload
      if (activeChannel) {
        const { messages, users } = normalization(activeChannel)
        activeChannel = {
          ...activeChannel,
          messages: messages,
          users: users,
          lastViewedAt: action.payload.lastViewedAt ?
            action.payload.lastViewedAt :
            state.channels[action.payload.id] ?
              state.channels[action.payload.id].lastViewedAt :
              new Date(Date.now()).toGMTString()
        }
      }
      const channels = state.channels
      delete channels[id]
      const allChannels = [...state.allChannels]
      allChannels.splice(allChannels.indexOf(id), 1)
      return { ...state, channels, activeChannel, allChannels }
    }
    case UPDATE_CHANNEL_USER: {
      return {
        ...state,
        activeChannel: {
          ...state.activeChannel,
          users: {
            ...state.activeChannel.users,
            [action.payload.id]: action.payload
          }
        }
      }
    }
    case REMOVE_CHANNEL_USER: {
      const users = { ...state.activeChannel.users }
      delete users[action.payload.id]
      return {
        ...state,
        activeChannel: {
          ...state.activeChannel,
          users
        }
      }
    }
    case UPDATE_ACTIVE_CHANNEL: {
      const { messages, users } = normalization(action.payload)
      const activeChannel = {
        ...action.payload,
        messages: messages,
        users: users,
        lastViewedAt: action.payload.lastViewedAt ?
          action.payload.lastViewedAt :
          state.channels[action.payload.id] ?
            state.channels[action.payload.id].lastViewedAt :
            new Date(Date.now()).toGMTString()
      }
      return { ...state, activeChannel }
    }
    case UPDATE_CHANNEL: {
      const channel = {
        id: action.payload.id,
        name: action.payload.name,
        creatorId: action.payload.creator.id,
        description: action.payload.description,
        messageNum: action.payload.messages.length,
        createdAt: action.payload.createdAt,
        lastViewedAt: action.payload.lastViewedAt ?
          action.payload.lastViewedAt :
          state.channels[action.payload.id] ?
            state.channels[action.payload.id].lastViewedAt :
            new Date(Date.now()).toGMTString()
      }
      let channels = Object.values(state.channels)
      channels.push(channel)
      channels = channels.sort((a, b) => a.id - b.id)
      const sortedChannels = {}
      for (let channel of channels) {
        sortedChannels[channel.id] = channel
      }
      let allChannels = [...state.allChannels]
      if (!allChannels.includes(channel.id)) {
        allChannels.push(channel.id)
      }
      return { ...state, channels: sortedChannels, allChannels }
    }
    case SET_CHANNEL_LAST_VIEWED: {
      const channelId = action.payload
      const activeChannel = { ...state.activeChannel }
      const channels = { ...state.channels }
      if (activeChannel.id === channelId) {
        activeChannel.lastViewedAt = new Date(Date.now()).toGMTString()
      }
      channels[channelId].lastViewedAt = new Date(Date.now()).toGMTString()
      return { ...state, activeChannel, channels }
    }
    default:
      return state;
  }
}
