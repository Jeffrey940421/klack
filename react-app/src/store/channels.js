const LOAD_CHANNELS = "channels/LOAD_CHANNELS"
const ADD_CHANNEL = "channels/ADD_CHANNEL"
const DELETE_CHANNEL = "channels/DELETE_CHANNEL"
const DELETE_WORKSPACE_CHANNELS = "channels/DELETE_WORKSPACE_CHANNELS"

const loadChannels = (channels) => ({
  type: LOAD_CHANNELS,
  payload: channels
})

export const addChannel = (channel) => ({
  type: ADD_CHANNEL,
  payload: channel
})

export const deleteChannel = (channel) => ({
  type: DELETE_CHANNEL,
  payload: channel
})

export const deleteWorkspaceChannels = (workspaceId) => ({
  type: DELETE_WORKSPACE_CHANNELS,
  payload: workspaceId
})

const initialState = { channelList: {}, organizedChannels: {} };

export const listChannels = () => async (dispatch) => {
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
    dispatch(addChannel(data.channel));
    if (data.prevActiveChannel) {
      dispatch(addChannel(data.prevActiveChannel))
    }
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
    dispatch(addChannel(data.channel));
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

export const removeChannel = (channel) => async (dispatch) => {
  const response = await fetch(`api/channels/${channel.id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(deleteChannel(channel));
    return data;
  } else if (response.status < 500) {
    const data = await response.json();
    return data.errors;
  } else {
    return ["An error occurred. Please try again."];
  }
}

export const leaveChannel = (channel) => async (dispatch) => {
  const response = await fetch(`api/channels/${channel.id}/leave`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(deleteChannel(channel));
    return data;
  } else if (response.status < 500) {
    const data = await response.json();
    return data.errors;
  } else {
    return ["An error occurred. Please try again."];
  }
}

export const addChannelUser = (channelId, userId) => async (dispatch) => {
  const response = await fetch(`api/channels/${channelId}/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(addChannel(data.channel));
    return data;
  } else if (response.status < 500) {
    const data = await response.json();
    return data.errors;
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
    case LOAD_CHANNELS: {
      const organizedChannels = {}
      for (let channel of action.payload) {
        if (channel.workspaceId in organizedChannels) {
          organizedChannels[channel.workspaceId].push(channel.id)
        } else {
          organizedChannels[channel.workspaceId] = [channel.id]
        }
      }
      return { ...state, channelList: normalize(action.payload), organizedChannels }
    }
    case ADD_CHANNEL: {
      const organizedChannels = { ...state.organizedChannels }
      if (action.payload.workspaceId in organizedChannels) {
        if (!organizedChannels[action.payload.workspaceId].includes(action.payload.id)) {
          organizedChannels[action.payload.workspaceId].push(action.payload.id)
        }
      } else {
        organizedChannels[action.payload.workspaceId] = [action.payload.id]
      }
      return {
        ...state,
        channelList: { ...state.channelList, [action.payload.id]: action.payload },
        organizedChannels
      }
    }
    case DELETE_CHANNEL: {
      const organizedChannels = { ...state.organizedChannels }
      if (action.payload.workspaceId in organizedChannels) {
        if (organizedChannels[action.payload.workspaceId].includes(action.payload.id)) {
          const index = organizedChannels[action.payload.workspaceId].indexOf(action.payload.id)
          organizedChannels[action.payload.workspaceId].splice(index, 1)
        }
      }
      const channelList = { ...state.channelList }
      delete channelList[action.payload.id]
      return { ...state, channelList, organizedChannels }
    }
    case DELETE_WORKSPACE_CHANNELS: {
      const channelList = { ...state.channelList }
      const organizedChannels = { ...state.organizedChannels }
      for (let channelId of organizedChannels[action.payload]) {
        delete channelList[channelId]
      }
      delete organizedChannels[action.payload]
      return { ...state, channelList, organizedChannels }
    }

    // case LOAD_ACTIVE_CHANNEL: {
    //   const { messages, users } = normalization(action.payload)
    //   const activeChannel = {
    //     ...action.payload,
    //     messages: messages,
    //     users: users
    //   }
    //   return { ...state, activeChannel }
    // }
    // case LOAD_ALL_CHANNELS: {
    //   return { ...state, allChannels: action.payload }
    // }

    // case DELETE_CHANNEL: {
    //   let { id, activeChannel } = action.payload
    //   if (activeChannel) {
    //     const { messages, users } = normalization(activeChannel)
    //     activeChannel = {
    //       ...activeChannel,
    //       messages: messages,
    //       users: users,
    //       lastViewedAt: action.payload.lastViewedAt ?
    //         action.payload.lastViewedAt :
    //         state.channels[action.payload.id] ?
    //           state.channels[action.payload.id].lastViewedAt :
    //           new Date(Date.now()).toGMTString()
    //     }
    //   }
    //   const channels = state.channels
    //   delete channels[id]
    //   const allChannels = [...state.allChannels]
    //   allChannels.splice(allChannels.indexOf(id), 1)
    //   return { ...state, channels, activeChannel, allChannels }
    // }
    // case UPDATE_CHANNEL_USER: {
    //   return {
    //     ...state,
    //     activeChannel: {
    //       ...state.activeChannel,
    //       users: {
    //         ...state.activeChannel.users,
    //         [action.payload.id]: action.payload
    //       }
    //     }
    //   }
    // }
    // case REMOVE_CHANNEL_USER: {
    //   const users = { ...state.activeChannel.users }
    //   delete users[action.payload.id]
    //   return {
    //     ...state,
    //     activeChannel: {
    //       ...state.activeChannel,
    //       users
    //     }
    //   }
    // }
    // case UPDATE_ACTIVE_CHANNEL: {
    //   const { messages, users } = normalization(action.payload)
    //   const activeChannel = {
    //     ...action.payload,
    //     messages: messages,
    //     users: users,
    //     lastViewedAt: action.payload.lastViewedAt ?
    //       action.payload.lastViewedAt :
    //       state.channels[action.payload.id] ?
    //         state.channels[action.payload.id].lastViewedAt :
    //         new Date(Date.now()).toGMTString()
    //   }
    //   return { ...state, activeChannel }
    // }
    // case UPDATE_CHANNEL: {
    //   const channel = {
    //     id: action.payload.id,
    //     name: action.payload.name,
    //     creatorId: action.payload.creator.id,
    //     description: action.payload.description,
    //     messageNum: action.payload.messages.length,
    //     createdAt: action.payload.createdAt,
    //     lastViewedAt: action.payload.lastViewedAt ?
    //       action.payload.lastViewedAt :
    //       state.channels[action.payload.id] ?
    //         state.channels[action.payload.id].lastViewedAt :
    //         new Date(Date.now()).toGMTString()
    //   }
    //   let channels = Object.values(state.channels)
    //   channels.push(channel)
    //   channels = channels.sort((a, b) => a.id - b.id)
    //   const sortedChannels = {}
    //   for (let channel of channels) {
    //     sortedChannels[channel.id] = channel
    //   }
    //   let allChannels = [...state.allChannels]
    //   if (!allChannels.includes(channel.id)) {
    //     allChannels.push(channel.id)
    //   }
    //   return { ...state, channels: sortedChannels, allChannels }
    // }
    // case SET_CHANNEL_LAST_VIEWED: {
    //   const channelId = action.payload
    //   const activeChannel = { ...state.activeChannel }
    //   const channels = { ...state.channels }
    //   if (activeChannel.id === channelId) {
    //     activeChannel.lastViewedAt = new Date(Date.now()).toGMTString()
    //   }
    //   channels[channelId].lastViewedAt = new Date(Date.now()).toGMTString()
    //   return { ...state, activeChannel, channels }
    // }
    default:
      return state;
  }
}
