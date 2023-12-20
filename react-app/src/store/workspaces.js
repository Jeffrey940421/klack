const LOAD_WORKSPACES = "workspaces/LOAD_WORKSPACES"
const ADD_WORKSPACE = "workspaces/ADD_WORKSPACE"
const DELTE_WORKSPACE = "workspaces/DELETE_WORKSPACE"
const ADD_INVITATION = "workspaces/ADD_INVITATION"
const UPDATE_WORKSPACE = "workspaces/UPDATE_WORKSPACE"
const EDIT_ACTIVE_WORKSPACE = "workspaces/EDIT_ACTIVE_WORKSPACE"
const UPDATE_WORKSPACE_USER = "workspaces/UPDATE_WORKSPACE_USER"
const REMOVE_WORKSPACE_USER = "workspaces/REMOVE_WORKSPACE_USER"
const SET_WORKSPACE_LAST_VIEWED = "workspaces/SET_WORKSPACE_LAST_VIEWED"
const LOAD_ACTIVE_WORKSPACE = "workspaces/LOAD_ACTIVE_WORKSPACE"

const loadWorkspaces = (workspaces) => ({
  type: LOAD_WORKSPACES,
  payload: workspaces
})

export const addWorkspace = (workspace) => ({
  type: ADD_WORKSPACE,
  payload: workspace
})

export const deleteWorkspace = (id) => ({
  type: DELTE_WORKSPACE,
  payload: id
})

const loadActiveWorkspace = (workspace) => ({
  type: LOAD_ACTIVE_WORKSPACE,
  payload: workspace
})

export const addInvitation = (invitation) => ({
  type: ADD_INVITATION,
  payload: invitation
})

export const updateWorkspace = (workspace) => ({
  type: UPDATE_WORKSPACE,
  payload: workspace
})

export const editActiveWorkspace = (workspace) => ({
  type: EDIT_ACTIVE_WORKSPACE,
  payload: workspace
})

export const updateWorkspaceUser = (profile) => ({
  type: UPDATE_WORKSPACE_USER,
  payload: profile
})

// export const removeWorkspaceUser = (profile) => ({
//   type: REMOVE_WORKSPACE_USER,
//   payload: profile
// })

export const setWorkspaceLastViewed = (workspaceId) => ({
  type: SET_WORKSPACE_LAST_VIEWED,
  payload: workspaceId
})

const initialState = { workspaceList: {}, organizedWorkspaces: [] };

export const listWorkspaces = () => async (dispatch) => {
  const response = await fetch("api/workspaces/current", {
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(loadWorkspaces(data.workspaces));
    return data.workspaces;
  } else if (response.status < 500) {
    const data = await response.json();
    if (data.errors) {
      return data.errors
    }
  } else {
    return ["An error occurred. Please try again."]
  }
}

export const joinWorkspace = (id, profile) => async (dispatch) => {
  const response = await fetch(`api/workspaces/${id}/join`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nickname: profile.nickname,
      profile_image_url: profile.imageUrl
    })
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(addWorkspace(data.workspace));
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

export const setActiveChannel = (workspaceId, channelId) => async (dispatch) => {
  const response = await fetch(`api/workspaces/${workspaceId}/active_channel`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      active_channel_id: channelId
    }),
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(addWorkspace(data.workspace))
    return data;
  } else if (response.status < 500) {
    const data = await response.json();
    if (data.errors) {
      return data.errors
    }
  } else {
    return ["An error occurred. Please try again."]
  }
}

export const removeWorkspace = (id) => async (dispatch) => {
  const response = await fetch(`api/workspaces/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(deleteWorkspace(id));
    return data;
  } else if (response.status < 500) {
    const data = await response.json();
    if (data.errors) {
      return data.errors
    }
  } else {
    return ["An error occurred. Please try again."]
  }
}

export const leaveWorkspace = (id) => async (dispatch) => {
  const response = await fetch(`api/workspaces/${id}/leave`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(deleteWorkspace(id));
    return data;
  } else if (response.status < 500) {
    const data = await response.json();
    if (data.errors) {
      return data.errors
    }
  } else {
    return ["An error occurred. Please try again."]
  }
}

export const createWorkspace = (workspace) => async (dispatch) => {
  const response = await fetch(`api/workspaces/new`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: workspace.name,
      icon_url: workspace.iconUrl,
      nickname: workspace.nickname,
      profile_image_url: workspace.imageUrl
    })
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(addWorkspace(data.workspace));
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

export const editWorkspace = (id, workspace) => async (dispatch) => {
  const response = await fetch(`api/workspaces/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: workspace.name,
      icon_url: workspace.iconUrl
    })
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(addWorkspace(data));
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



export const getActiveWorkspaces = (id) => async (dispatch) => {
  const response = await fetch(`api/workspaces/${id}`, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(loadActiveWorkspace(data));
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



export const createInvitation = (id, email) => async (dispatch) => {
  const response = await fetch(`api/workspaces/${id}/invitations/new`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient_email: email
    })
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(addInvitation(data));
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

// export const editWorkspace = (id, workspace) => async (dispatch) => {
//   const response = await fetch(`api/workspaces/${id}`, {
//     method: "PUT",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       name: workspace.name,
//       icon_url: workspace.iconUrl
//     })
//   });
//   if (response.ok) {
//     const data = await response.json();
//     dispatch(addWorkspace(data));
//     return null;
//   } else if (response.status < 500) {
//     const data = await response.json();
//     if (data.errors) {
//       return data.errors;
//     }
//   } else {
//     return ["An error occurred. Please try again."];
//   }
// }

// export const removeWorkspace = (id) => async (dispatch) => {
//   const response = await fetch(`api/workspaces/${id}`, {
//     method: "DELETE",
//     headers: {
//       "Content-Type": "application/json",
//     },
//   });
//   if (response.ok) {
//     const data = await response.json();
//     dispatch(deleteWorkspace(id, data.activeWorkspace));
//     return null;
//   } else if (response.status < 500) {
//     const data = await response.json();
//     if (data.errors) {
//       return data.errors;
//     }
//   } else {
//     return ["An error occurred. Please try again."];
//   }
// }

export const leaveCurrentWorkspace = (id) => async (dispatch) => {
  const response = await fetch(`api/workspaces/${id}/leave`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(deleteWorkspace(id, data.activeWorkspace));
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

export const editProfile = (userId, workspaceId, profile) => async (dispatch) => {
  const response = await fetch(`api/workspaces/${workspaceId}/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nickname: profile.nickname,
      profile_image_url: profile.imageUrl
    })
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(addWorkspace(data));
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
  const invitations = {}
  for (let invitation of payload.associatedInvitations) {
    invitations[invitation.id] = invitation
  }
  const channels = {}
  for (let channel of payload.channels) {
    channels[channel.id] = channel
  }
  const users = {}
  for (let user of payload.users) {
    users[user.id] = user
  }
  return { invitations, channels, users }
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
    case LOAD_WORKSPACES: {
      const organizedWorkspaces = action.payload.map(workspace => workspace.id)
      return { ...state, workspaceList: normalize(action.payload), organizedWorkspaces };
    }
    case ADD_WORKSPACE: {
      const organizedWorkspaces = [...state.organizedWorkspaces]
      if (!organizedWorkspaces.includes(action.payload.id)) {
        organizedWorkspaces.push(action.payload.id)
      }
      const workspaceList = { ...state.workspaceList }
      workspaceList[action.payload.id] = action.payload
      return { ...state, workspaceList, organizedWorkspaces };
    }
    case DELTE_WORKSPACE: {
      const organizedWorkspaces = [...state.organizedWorkspaces]
      const workspaceList = { ...state.workspaceList }
      delete workspaceList[action.payload]
      if (organizedWorkspaces.includes(action.payload)) {
        const index = organizedWorkspaces.indexOf(action.payload)
        organizedWorkspaces.splice(index, 1)
      }
      return { ...state, workspaceList, organizedWorkspaces };
    }
    case LOAD_ACTIVE_WORKSPACE: {
      const { invitations, channels, users } = normalization(action.payload)
      const activeWorkspace = {
        ...action.payload,
        associatedInvitations: invitations,
        channels: channels,
        users: users
      }
      return { ...state, activeWorkspace: activeWorkspace }
    }
    case ADD_INVITATION: {
      const activeWorkspace = state.activeWorkspace
      const invitation = action.payload
      activeWorkspace.associatedInvitations[invitation.id] = invitation
      return { ...state, activeWorkspace }
    }
    case UPDATE_WORKSPACE: {
      const workspace = {
        id: action.payload.id,
        name: action.payload.name,
        ownerId: action.payload.owner.id,
        iconUrl: action.payload.iconUrl,
        createdAt: action.payload.createdAt,
        lastViewedAt: action.payload.lastViewedAt ?
          action.payload.lastViewedAt :
          state.workspaces[action.payload.id] ?
            state.workspaces[action.payload.id].lastViewedAt :
            new Date(Date.now()).toGMTString()
      }
      return { ...state, workspaces: { ...state.workspaces, [workspace.id]: workspace } }
    }
    case EDIT_ACTIVE_WORKSPACE: {
      const { invitations, channels, users } = normalization(action.payload)
      const activeWorkspace = {
        ...action.payload,
        associatedInvitations: invitations,
        channels: channels,
        users: users,
        lastViewedAt: action.payload.lastViewedAt ?
          action.payload.lastViewedAt :
          state.workspaces[action.payload.id] ?
            state.workspaces[action.payload.id].lastViewedAt :
            new Date(Date.now()).toGMTString()
      }
      return { ...state, activeWorkspace }
    }
    case UPDATE_WORKSPACE_USER: {
      return {
        ...state,
        activeWorkspace: {
          ...state.activeWorkspace,
          users: {
            ...state.activeWorkspace.users,
            [action.payload.id]: action.payload
          }
        }
      }
    }
    case REMOVE_WORKSPACE_USER: {
      const users = { ...state.activeWorkspace.users }
      delete users[action.payload.id]
      return {
        ...state,
        activeWorkspace: {
          ...state.activeWorkspace,
          users
        }
      }
    }
    case SET_WORKSPACE_LAST_VIEWED: {
      const workspaceId = action.payload
      const activeWorkspace = { ...state.activeWorkspace }
      const workspaces = { ...state.workspaces }
      if (workspaceId === activeWorkspace.id) {
        activeWorkspace.lastViewedAt = new Date(Date.now()).toGMTString()
      }
      workspaces[workspaceId].lastViewedAt = new Date(Date.now()).toGMTString()
      return { ...state, workspaces, activeWorkspace }
    }
    default:
      return state;
  }
}
