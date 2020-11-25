<template>
  <div>
    <v-app-bar app dense dark tile elevation="5">
      <v-toolbar-title class="title pl-0"
        >Elemental Chat {{ channel.info.name ? "- " + channel.info.name : "" }}
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              id="update-handle"
              color="action"
              icon
              v-bind="attrs"
              v-on="on"
              @click="updateHandle()"
              small
            >
              <v-icon>mdi-account-cog</v-icon>
            </v-btn>
          </template>
          <span>Update user handle</span>
        </v-tooltip>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-toolbar-title class="subtitle-2" v-if="appInterface"
        >App Id - {{ appInterface.appId }}</v-toolbar-title
      >
    </v-app-bar>
    <v-card width="100%" class="fill-height pl-1 pt-1 pr-1">
      <v-row no-gutters height="100%">
        <v-col cols="5" md="3">
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
        <v-col cols="7" md="9">
          <v-card class="ma-0 pt-n1 pl-1" dark>
            <messages :key="channel.channel.uuid" :channel="channel" />
          </v-card>
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>

<script>
import { mapState, mapActions } from "vuex";
export default {
  name: "ElementalChat",
  components: {
    Channels: () => import("../components/Channels.vue"),
    Messages: () => import("../components/Messages.vue")
  },
  data() {
    return {
      showAdd: false,
      refreshKey: 0
    };
  },
  methods: {
    ...mapActions("elementalChat", ["listChannels", "updateHandle"]),
    openChannel() {
      this.refreshKey += 1;
    },
    channelAdded() {
      this.showAdd = false;
    }
  },
  computed: {
    ...mapState(["connectedToHolochain"]),
    ...mapState(["appInterface"]),
    ...mapState("elementalChat", ["channels", "channel"])
  },
  watch: {
    connectedToHolochain(val) {
      if (val) this.listChannels({ category: "General" });
    }
  }
};
</script>
