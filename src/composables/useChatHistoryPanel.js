export function createChatHistoryState() {
  return {
    showHistoryPanel: false,
    chatHistory: [],
  };
}

export function createChatHistoryMethods(historyUtils) {
  return {
    openHistoryPanel() {
      this.loadChatHistory();
      this.showHistoryPanel = true;
    },
    loadChatHistory() {
      this.chatHistory = historyUtils.loadHistory();
    },
    serializeMessagesForHistory(messages = this.messages) {
      return messages.map((msg) => ({
        role: msg.role,
        text: msg.text || "",
        attachments: Array.isArray(msg.attachments)
          ? msg.attachments.map((att) => ({
              kind:
                att?.kind === "image" &&
                (!(typeof att?.src === "string") ||
                  att.src.startsWith("data:"))
                  ? "file"
                  : att?.kind || "file",
              name: att?.name || "",
              emoji: att?.emoji || "",
              type: att?.type || "",
              src:
                typeof att?.src === "string" && !att.src.startsWith("data:")
                  ? att.src
                  : "",
            }))
          : [],
      }));
    },
    findLastMessageText(role) {
      for (let i = this.messages.length - 1; i >= 0; i -= 1) {
        const msg = this.messages[i];
        if (msg?.role === role && typeof msg.text === "string" && msg.text) {
          return msg.text.slice(0, 120);
        }
      }
      return "";
    },
    recordChatHistory({ lastUserText = "", lastBotText = "" } = {}) {
      const snapshot = this.serializeMessagesForHistory();
      if (!snapshot.length) return;
      const payload = {
        id: this.sessionId || this.generateSessionId(),
        updatedAt: Date.now(),
        messageCount: snapshot.length,
        lastUserText: lastUserText || this.findLastMessageText("user"),
        lastBotText: lastBotText || this.findLastMessageText("bot"),
        messages: snapshot,
      };
      const { history } = historyUtils.upsertHistory(this.chatHistory, payload);
      this.chatHistory = history;
    },
    clearChatHistory() {
      historyUtils.clearHistory();
      this.chatHistory = [];
    },
    onHistoryClear() {
      this.clearChatHistory();
      this.showHistoryPanel = false;
    },
    onHistoryEntrySelect(sessionId) {
      const target = this.chatHistory.find((item) => item.id === sessionId);
      if (!target) return;
      if (Array.isArray(target.messages)) {
        this.messages = target.messages.map((msg) => ({
          role: msg?.role || "bot",
          text: typeof msg?.text === "string" ? msg.text : "",
          attachments: Array.isArray(msg?.attachments)
            ? msg.attachments.map((att) => ({ ...att }))
            : [],
        }));
      }
      this.sessionId = target.id;
      this.showHistoryPanel = false;
      this.forceInitPrompts = false;
      this.isAwaitingFollowups = false;
      this.suggestedPrompts = [];
      this.$nextTick(() => {
        this.scrollToBottom();
      });
    },
  };
}
