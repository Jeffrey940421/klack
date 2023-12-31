store = {
  session: {
    user: {
      id: integer,
      email: string,
      activeWorkspaceId: integer
    },
    receivedInvitation: {
      [invitationId]: {
        id: integer,
        senderEmail: string,
        recipientEmail: string,
        workspaceId: integer,
        workspaceName: string,
        status: string,
        createdAt: datetime
      }
    },
    sentInvitations: {
      [invitationId]: {
        id: integer,
        senderEmail: string,
        recipientEmail: string,
        workspaceId: integer,
        workspaceName: string,
        status: string,
        createdAt: datetime
      }
    },
  },
  workspaces: {
    workspaceList: {
      [workspaceId]: {
        id: integer,
        name: string,
        iconUrl: string,
        ownerId: integer,
        createdAt: datetime,
        joinedAt: datetime,
        activeChannelId: integer
      }
    },
    organizedWorkspaces: [workspaceId]
  },
  channels: {
    channelList: {
      [channelId]: {
        id: integer,
        name: string,
        description: string,
        creatorId: integer,
        creatorEmail: string,
        workspaceId: integer,
        users: [userId],
        messageNum: integer,
        joinedAt: datetime,
        createdAt: datetime,
        lastViewedAt: datetime,
      }
    },
    organizedChannels: {
      [workspaceId]: [channelId]
    }
  },
  messages: {
    messageList: {
      [messageId]: {
        id: integer,
        channelId: integer,
        workspaceId: integer,
        senderId: integer,
        senderEmail: string,
        content: string,
        systemMessage: boolean,
        attachments: [attachmentUrl],
        replies: {
          [replyId]: {
            id: integer,
            messageId: integer,
            senderId: integer,
            senderEmail: string,
            content: string,
            createdAt: datetime,
            updatedAt: datetime
          }
        },
        createdAt: datetime,
        updatedAt: datetime
      }
    },
    organizedMessages: {
      [channelId]: [messageId]
    }
  },
  users: {
    [workspaceId]: {
      [userId]: {
        workspaceId: integer,
        userId: integer,
        email: string,
        nickname: string,
        profileImageUrl: string,
        role: string
      }
    }
  }
}
