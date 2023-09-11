const LOAD_WORKSPACES = "workspaces/LOAD_WORKSPACES"
const LOAD_ACTIVE_WORKSPACE = "workspaces/LOAD_ACTIVE_WORKSPACE"
const ADD_WORKSPACE = "workspaces/ADD_WORKSPACE"

const loadWorkspaces = (workspaces) => ({
  type: LOAD_WORKSPACES,
  payload: workspaces
})

const loadActiveWorkspace = (workspace) => ({
  type: LOAD_ACTIVE_WORKSPACE,
  payload: workspace
})

const addWorkspace = (workspace) => ({
  type: ADD_WORKSPACE,
  payload: workspace
})

const initialState = { workspaces: null, activeWorkspace: null };

export const getWorkspaces = () => async (dispatch) => {
  const response = await fetch("api/workspaces/current", {
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    const data = await response.json();
    dispatch(loadWorkspaces(data.workspaces));
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
      profile_image_url: workspace.profileImageUrl
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

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case LOAD_WORKSPACES: {
      const workspaces = {}
      for (let workspace of action.payload) {
        workspaces[workspace.id] = workspace
      }
      return { ...state, workspaces: workspaces };
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
    case ADD_WORKSPACE: {
      const { invitations, channels, users } = normalization(action.payload)
      const activeWorkspace = {
        ...action.payload,
        associatedInvitations: invitations,
        channels: channels,
        users: users
      }
      const workspace = {
        id: action.payload.id,
        name: action.payload.name,
        ownerId: action.payload.owner.id,
        iconUrl: action.payload.iconUrl,
        createdAt: action.payload.createdAt
      }
      return { ...state, workspaces: { ...state.workspaces, [action.payload.id]: workspace }, activeWorkspace: activeWorkspace }
    }
    default:
      return state;
  }
}
