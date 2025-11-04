<template>
  <div class="min-h-screen bg-slate-50">
    <ChatWindow />
  </div>
</template>

<script>
import ChatWindow from "@/components/ChatWindow.vue";

export default {
  name: "ChatView",
  components: {
    ChatWindow,
  },
};
</script>
