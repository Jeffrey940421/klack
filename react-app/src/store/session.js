const SET_USER = "session/SET_USER";
const REMOVE_USER = "session/REMOVE_USER";
const LOAD_RECEIVED_INVITATIONS = "session/LOAD_RECEIVED_INVITATIONS"
const LOAD_SENT_INVITATIONS = "session/LOAD_SENT_INVITATIONS"
const ADD_RECEIVED_INVITATION = "session/ADD_INVITATION"
const ADD_SENT_INVITATION = "session/ADD_SENT_INVITATION"

export const setUser = (user) => ({
	type: SET_USER,
	payload: user,
});

const removeUser = () => ({
	type: REMOVE_USER,
});

const loadReceivedInvitations = (invitations) => ({
	type: LOAD_RECEIVED_INVITATIONS,
	payload: invitations
})

const loadSentInvitations = (invitations) => ({
	type: LOAD_SENT_INVITATIONS,
	payload: invitations
})

export const addReceivedInvitation = (invitation) => ({
	type: ADD_RECEIVED_INVITATION,
	payload: invitation
})

export const addSentInvitation = (invitation) => ({
	type: ADD_SENT_INVITATION,
	payload: invitation
})

const initialState = { user: null, receivedInvitations: {}, sentInvitations: {} };

export const authenticate = () => async (dispatch) => {
	const response = await fetch("/api/auth/", {
		headers: {
			"Content-Type": "application/json",
		},
	});
	if (response.ok) {
		const data = await response.json();
		if (data.errors) {
			return;
		}

		dispatch(setUser(data));
	}
};

export const login = (email, password) => async (dispatch) => {
	const response = await fetch("/api/auth/login", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			email,
			password,
		}),
	});

	if (response.ok) {
		const data = await response.json();
		dispatch(setUser(data));
		return null;
	} else if (response.status < 500) {
		const data = await response.json();
		if (data.errors) {
			return data.errors;
		}
	} else {
		return ["An error occurred. Please try again."];
	}
};

export const demoLogin = (id) => async (dispatch) => {
	const response = await fetch(`/api/auth/demo_login/${id}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		}
	});

	if (response.ok) {
		const data = await response.json();
		dispatch(setUser(data));
		return null;
	} else if (response.status < 500) {
		const data = await response.json();
		if (data.errors) {
			return data.errors;
		}
	} else {
		return ["An error occurred. Please try again."];
	}
};

export const logout = () => async (dispatch) => {
	const response = await fetch("/api/auth/logout", {
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (response.ok) {
		dispatch(removeUser());
	}
};

export const signUp = (email, password) => async (dispatch) => {
	const response = await fetch("/api/auth/signup", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			email,
			password,
		}),
	});

	if (response.ok) {
		const data = await response.json();
		dispatch(setUser(data));
		return null;
	} else if (response.status < 500) {
		const data = await response.json();
		if (data.errors) {
			return data.errors;
		}
	} else {
		return ["An error occurred. Please try again."];
	}
};

export const listReceivedInvitations = () => async (dispatch) => {
	const response = await fetch(`/api/invitations/received`, {
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (response.ok) {
		const data = await response.json();
		dispatch(loadReceivedInvitations(data.receivedInvitations));
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

export const listSentInvitations = () => async (dispatch) => {
	const response = await fetch(`/api/invitations/sent`, {
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (response.ok) {
		const data = await response.json();
		dispatch(loadSentInvitations(data.sentInvitations));
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

export const sendInvitation = (workspaceId, email) => async (dispatch) => {
	const response = await fetch(`/api/workspaces/${workspaceId}/invitations/new`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			recipient_email: email
		}),
	});
	if (response.ok) {
		const data = await response.json();
		dispatch(addSentInvitation(data));
		return null;
	} else if (response.status < 500) {
		const data = await response.json();
		if (data.errors) {
			return data.errors
		}
	} else {
		return ["An error occurred. Please try again."];
	}
}

export const processInvitation = (id, action) => async (dispatch) => {
	const response = await fetch(`/api/invitations/${id}/${action}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
		},
	});
	if (response.ok) {
		const data = await response.json();
		dispatch(addReceivedInvitation(data));
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

export const setActiveWorkspace = (userId, workspaceId) => async (dispatch) => {
	const response = await fetch(`/api/users/${userId}/active_workspace`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			active_workspace_id: workspaceId
		}),
	});

	if (response.ok) {
		const data = await response.json();
		dispatch(setUser(data.user));
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

function normalize(state) {
	const newState = {}
	state.forEach(record => {
		newState[record.id] = record
	})
	return newState
}

export default function reducer(state = initialState, action) {
	switch (action.type) {
		case SET_USER:
			return { ...state, user: action.payload };
		case REMOVE_USER:
			return { ...state, user: null };
		case LOAD_RECEIVED_INVITATIONS:
			return {
				...state,
				receivedInvitations: normalize(action.payload)
			}
		case LOAD_SENT_INVITATIONS:
			return {
				...state,
				sentInvitations: normalize(action.payload)
			}
		case ADD_RECEIVED_INVITATION:
			return {
				...state,
				receivedInvitations: { ...state.receivedInvitations, [action.payload.id]: action.payload }
			}
		case ADD_SENT_INVITATION:
			return {
				...state,
				sentInvitations: { ...state.sentInvitations, [action.payload.id]: action.payload }
			}
		default:
			return state;
	}
}
