import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import * as workspaceActions from '../../store/workspaces';
import * as sessionActions from '../../store/session';
import * as channelActions from '../../store/channels';
import * as messageActions from '../../store/messages';
import * as userActions from '../../store/users';
import ProfileButton from './ProfileButton';
import NotificationButton from './NotificationButton';
import { useSocket } from '../../context/SocketContext';
import { useThread } from '../../context/ThreadContext';
import './Navigation.css';

function Navigation() {
	const dispatch = useDispatch();
	const { messageId } = useThread()
	const sessionUser = useSelector(state => state.session.user);
	const activeWorkspaceId = sessionUser.activeWorkspaceId;
	const activeWorkspace = useSelector(state => state.workspaces.workspaceList[activeWorkspaceId]);
	const activeChannelId = activeWorkspace ? activeWorkspace.activeChannelId : null;
	const workspaces = useSelector(state => state.workspaces.workspaceList);
	const channels = useSelector(state => state.channels.channelList);
	const messages = useSelector(state => state.messages.messageList);
	const { socketConnection } = useSocket()

	useEffect(() => {
		if (socketConnection) {
			socketConnection.on("edit_workspace", async (data) => {
				const senderId = JSON.parse(data.senderId)
				if (senderId !== sessionUser.id) {
					const workspace = JSON.parse(data.workspace)
					const editedWorkspace = workspaces[workspace.id]
					editedWorkspace.name = workspace.name
					editedWorkspace.iconUrl = workspace.iconUrl
					await dispatch((workspaceActions.addWorkspace(editedWorkspace)))
				}
			})
		}

		return (() => {
			socketConnection.off("edit_workspace");
		})
	}, [socketConnection, workspaces])


	useEffect(() => {
		if (socketConnection) {
			socketConnection.on("delete_workspace", async (data) => {
				const senderId = JSON.parse(data.senderId)
				if (senderId !== sessionUser.id) {
					const workspaceId = data.workspaceId
					if (sessionUser.activeWorkspaceId === workspaceId) {
						const newActiveWorkspace = Object.values(workspaces).find(workspace => workspace.id !== workspaceId)
						if (newActiveWorkspace) {
							await dispatch(sessionActions.setActiveWorkspace(sessionUser.id, newActiveWorkspace.id))
						} else {
							await dispatch(sessionActions.setActiveWorkspace(sessionUser.id, 0))
						}
					}
					await dispatch(workspaceActions.deleteWorkspace(workspaceId))
					await dispatch(messageActions.deleteWorkspaceMessages(workspaceId))
					await dispatch(userActions.deleteWorkspaceUsers(workspaceId))
				}
			})
		}

		return (() => {
			socketConnection.off("delete_workspace");
		})
	}, [socketConnection, workspaces, sessionUser])

	useEffect(() => {
		if (socketConnection) {
			socketConnection.on("send_invitation", async (data) => {
				const invitation = JSON.parse(data.invitation)
				await dispatch(sessionActions.addReceivedInvitation(invitation))
			})

			socketConnection.on("edit_invitation", async (data) => {
				const invitation = JSON.parse(data.invitation)
				await dispatch(sessionActions.addSentInvitation(invitation))
			})

			socketConnection.on("edit_profile", async (data) => {
				if (data.senderId !== sessionUser.id) {
					const profile = JSON.parse(data.workspaceUser)
					await dispatch(userActions.addUser(profile))
				}
			})

			socketConnection.on("join_workspace", async (data) => {
				if (data.senderId !== sessionUser.id) {
					const profile = JSON.parse(data.profile)
					await dispatch(userActions.addUser(profile))
				}
			})

			socketConnection.on("leave_workspace", async (data) => {
				if (data.senderId !== sessionUser.id) {
					const profile = JSON.parse(data.profile)
					await dispatch(userActions.deleteUser(profile))
				}
			})

			socketConnection.on("join_channel", async (data) => {
				const channel = JSON.parse(data.channel)
				const messages = JSON.parse(data.messages)
				await dispatch(channelActions.addChannel(channel))
				await dispatch(messageActions.addMessages(messages))
			})

			socketConnection.on("edit_message", async (data) => {
				if (data.senderId !== sessionUser.id) {
					const message = JSON.parse(data.message)
					await dispatch(messageActions.addMessage(message))
				}
			})

			socketConnection.on("send_reply", async (data) => {
				if (data.senderId !== sessionUser.id) {
					const reply = JSON.parse(data.reply)
					await dispatch(messageActions.addReply(reply))
				}
			})

			socketConnection.on("edit_reply", async (data) => {
				if (data.senderId !== sessionUser.id) {
					const reply = JSON.parse(data.reply)
					await dispatch(messageActions.addReply(reply))
				}
			})

			socketConnection.on("delete_reply", async (data) => {
				if (data.senderId !== sessionUser.id) {
					const replyId = data.replyId
					const messageId = data.messageId
					await dispatch(messageActions.deleteReply({
						replyId,
						messageId
					}))
				}
			})
		}

		return (() => {
			socketConnection.off("send_invitation");
			socketConnection.off("edit_invitation");
			socketConnection.off("edit_profile");
			socketConnection.off("join_workspace");
			socketConnection.off("leave_workspace");
			socketConnection.off("join_channel");
			socketConnection.off("edit_message");
			socketConnection.off("send_reply");
			socketConnection.off("edit_reply");
			socketConnection.off("delete_reply");
		})
	}, [socketConnection])

	useEffect(() => {
		if (socketConnection) {
			socketConnection.on("send_message", async (data) => {
				if (data.senderId !== sessionUser.id) {
					const message = JSON.parse(data.message)
					await dispatch(messageActions.addMessage(message))
					if (data.channel) {
						const channel = JSON.parse(data.channel)
						const editedChannel = channels[channel.id]
						editedChannel.name = channel.name
						editedChannel.description = channel.description
						editedChannel.messageNum = channel.messageNum
						editedChannel.users = channel.users
						await dispatch(channelActions.addChannel(editedChannel))
					}
				}
			})

			socketConnection.on("edit_channel", async (data) => {
				if (data.senderId !== sessionUser.id) {
					const channel = JSON.parse(data.channel)
					const editedChannel = channels[channel.id]
					editedChannel.name = channel.name
					editedChannel.description = channel.description
					editedChannel.messageNum = channel.messageNum
					editedChannel.users = channel.users
					await dispatch(channelActions.addChannel(editedChannel))
				}
			})

			socketConnection.on("delete_message", async (data) => {
				if (data.senderId !== sessionUser.id) {
					const messageId = data.messageId
					const channel = JSON.parse(data.channel)
					await dispatch(messageActions.deleteMessage({
						id: messageId,
						channelId: channel.id
					}))
					const editedChannel = channels[channel.id]
					editedChannel.name = channel.name
					editedChannel.description = channel.description
					editedChannel.messageNum = channel.messageNum
					editedChannel.users = channel.users
					await dispatch(channelActions.addChannel(editedChannel))
				}
			})
		}

		return (() => {
			socketConnection.off("send_message");
			socketConnection.off("edit_channel");
			socketConnection.off("delete_message");
		})
	}, [socketConnection, channels])

	useEffect(() => {
		if (socketConnection) {
			socketConnection.on("delete_channel", async (data) => {
				if (data.senderId !== sessionUser.id) {
					const newActiveChannel = JSON.parse(data.activeChannel)
					const deletedChannelId = data.deletedChannelId
					await dispatch(channelActions.deleteChannel({
						id: deletedChannelId,
						workspaceId: activeWorkspaceId
					}))
					await dispatch(messageActions.deleteChannelMessages(deletedChannelId))
					if (activeChannelId === deletedChannelId) {
						await dispatch(workspaceActions.setActiveChannel(activeWorkspaceId, newActiveChannel.id))
					}
				}
			})
		}

		return (() => {
			socketConnection.off("delete_channel");
		})
	}, [socketConnection, activeWorkspaceId, activeChannelId])

	return (
		<ul id='navigation_container'>
			<li>
				<img id="navigation_logo" className="logo" src="/klack_logo_white.svg" alt="logo" />
			</li>
			{
				activeWorkspace ?
					<button id="navigation_search">
						<span>
							Search {activeWorkspace.name}
						</span>
						<i className="fa-solid fa-magnifying-glass" />
					</button> :
					<div></div>
			}
			<li id="navigation_dropdowns">
				<NotificationButton />
				<ProfileButton />
			</li>
		</ul>
	);
}

export default Navigation;
