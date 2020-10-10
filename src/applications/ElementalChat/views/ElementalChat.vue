<template>
  <div>
    <v-card width="100%" class="fill-height pl-1 pt-1 pr-1">
      <v-row no-gutters height="100%">
        <v-col cols="3">
          <v-toolbar dense dark tile class="mb-1">
            <v-toolbar-title>Channels</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-tooltip bottom>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  id="add-channel"
                  color="action"
                  icon
                  v-bind="attrs"
                  v-on="on"
                  @click="listChannels({ category: 'General' })"
                  small
                >
                  <v-icon>mdi-refresh</v-icon>
                </v-btn>
              </template>
              <span>Check for new channels</span>
            </v-tooltip>
            <v-tooltip bottom>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  id="add-channel"
                  color="action"
                  icon
                  v-bind="attrs"
                  v-on="on"
                  @click="showAdd = true"
                  small
                >
                  <v-icon>mdi-chat-plus-outline</v-icon>
                </v-btn>
              </template>
              <span>Add a public Channel.</span>
            </v-tooltip>
          </v-toolbar>
          <channels
            :channels="channels"
            :showAdd="showAdd"
            @open-channel="openChannel"
            @channel-added="channelAdded"
          />
        </v-col>
        <v-col cols="9">
          <v-card class="ma-0 pt-n1 pl-1" dark>
            <v-app-bar app dense dark tile elevation="5">
              <v-toolbar-title class="title pl-0"
                >Elemental Chat - {{ channel.name }}</v-toolbar-title
              >
              <v-spacer></v-spacer>
            </v-app-bar>
            <messages :key="refreshKey" :channel="internalChannel" />
          </v-card>
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>

<script>
import { mapState, mapActions, mapMutations } from "vuex";
export default {
  name: "ElementalChat",
  components: {
    Channels: () => import("../components/Channels.vue"),
    Messages: () => import("../components/Messages.vue")
  },
  data() {
    return {
      showAdd: false,
      refreshKey: 0,
      internalChannel: {
        name: "",
        channel: { category: "General", uuid: "" },
        messages: []
      }
    };
  },
  methods: {
    ...mapActions("elementalChat", ["listChannels", "listMessages"]),
    ...mapMutations("elementalChat", ["setChannel"]),
    async openChannel(channel) {
      this.internalChannel = { ...channel };
      this.setChannel(channel);
      this.listMessages({ channel: channel, date: this.today });
      this.refreshKey += 1;
    },
    channelAdded() {
      this.showAdd = false;
    }
  },
  computed: {
    ...mapState("elementalChat", ["channels", "channel", "today"])
  },
  mounted() {
    this.internalChannel = { ...this.channel };
  }
};
</script>
