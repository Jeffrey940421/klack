const LOAD_USERS = "users/LOAD_USERS";
const ADD_USERS = "users/ADD_USERS";
const ADD_USER = "users/ADD_USER";
const DELETE_USER = "users/DELETE_USER";
const DELETE_WORKSPACE_USERS = "users/DELETE_WORKSPACE_USERS";

const loadUsers = (users) => ({
  type: LOAD_USERS,
  payload: users,
});

export const addUsers = (users) => ({
  type: ADD_USERS,
  payload: users,
});

export const addUser = (user) => ({
  type: ADD_USER,
  payload: user,
});

export const deleteUser = (user) => ({
  type: DELETE_USER,
  payload: user,
});

export const deleteWorkspaceUsers = (workspaceId) => ({
  type: DELETE_WORKSPACE_USERS,
  payload: workspaceId,
});

const initialState = {};

export const listUsers = () => async (dispatch) => {
  const response = await fetch("/api/users/current");
  if (response.ok) {
    const data = await response.json();
    dispatch(loadUsers(data.users));
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
  const response = await fetch(`/api/workspaces/${workspaceId}/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nickname: profile.nickname,
      profile_image_url: profile.imageUrl,
    }),
  })
  if (response.ok) {
    const data = await response.json()
    dispatch(addUser(data))
  } else if (response.status < 500) {
    const data = await response.json()
    if (data.errors) {
      return data.errors
    }
  } else {
    return ["An error occurred. Please try again."]
  }
}

function normalize(state) {
  const newState = {}
  state.forEach(record => {
    if (record.workspaceId in newState) {
      newState[record.workspaceId][record.userId] = record
    } else {
      newState[record.workspaceId] = { [record.userId]: record }
    }
  })
  return newState
}

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case LOAD_USERS: {
      return normalize(action.payload);
    }
    case ADD_USERS: {
      return { ...state, ...normalize(action.payload) }
    }
    case ADD_USER: {
      return {
        ...state,
        [action.payload.workspaceId]: {
          ...state[action.payload.workspaceId],
          [action.payload.userId]: action.payload
        }
      }
    }
    case DELETE_USER: {
      const newState = { ...state }
      if (action.payload.workspaceId in newState) {
        const users = newState[action.payload.workspaceId]
        if (action.payload.userId in users) {
          delete users[action.payload.userId]
        }
      }
      return newState
    }
    case DELETE_WORKSPACE_USERS: {
      const newState = { ...state }
      delete newState[action.payload]
      return newState
    }
    default:
      return state;
  }
}
