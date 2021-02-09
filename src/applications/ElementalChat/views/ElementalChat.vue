<template>
  <div>
    <v-app-bar app dense dark tile elevation="5">
      <v-toolbar-title class="title pl-0 no-wrap">
        <img src="@/assets/chat.png" width="35px" class="title-logo" />
        Elemental Chat {{ channel.info.name ? "- " + channel.info.name : "" }}
      </v-toolbar-title>
      <v-spacer></v-spacer>

      <v-toolbar-title v-if="isHoloSignedIn" @click="holoLogout" class="logout">
        Logout
      </v-toolbar-title>

      <v-toolbar-title class="title pl-0">
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
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              id="update-handle"
              color="action"
              icon
              v-bind="attrs"
              v-on="on"
              @click="getStats()"
              small
            >
              <v-icon>mdi-chart-line</v-icon>
            </v-btn>
          </template>
          <span>View Stats</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              id="update-handle"
              color="action"
              icon
              v-bind="attrs"
              v-on="on"
              small
            >
              <v-icon>mdi-information-outline</v-icon>
            </v-btn>
          </template>
          <div v-if="!appInterface">Loading Version Info...</div>
          <div v-if="appInterface">UI: {{ appInterface.appVersion }}</div>
          <div v-if="appInterface">DNA: {{ appInterface.appId }}</div>
        </v-tooltip>
      </v-toolbar-title>
    </v-app-bar>
    <v-card dark outlined class="pa-1 mb-1 v-application elevation-5">
      <v-card-text class="pl-0 text-center lime black-text">
        <p class="banner-text">
          This is a proof of concept application, not intended for full
          production use. Read more in our
          <a @click="visitPocPage" class="underline link-text"
            >Elemental Chat FAQs</a
          >
        </p>
      </v-card-text>
    </v-card>
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
    <v-dialog v-model="shouldDisplayStats" persistent max-width="660">
      <v-card>
        <v-card-title class="headline">
          Stats
        </v-card-title>
        <v-card-text v-if="statsAreLoading">Loading stats...</v-card-text>
        <v-card-text v-if="!statsAreLoading">
          <v-row align="center">
            <v-col class="display-1" cols="6">
              Total peers:
            </v-col>
            <v-col class="display-1" cols="6">
              {{ stats.agents == undefined ? "--" : stats.agents }} 👤
            </v-col>
          </v-row>
          <v-row align="center">
            <v-col class="display-1" cols="6">
              Active peers:
            </v-col>
            <v-col class="display-1" cols="6">
              {{ stats.active == undefined ? "--" : stats.active }} 👤
            </v-col>
          </v-row>
          <v-row align="center">
            <v-col class="display-1" cols="6">
              Channels:
            </v-col>
            <v-col class="display-1" cols="6">
              {{ stats.channels == undefined ? "--" : stats.channels }} 🗨️
            </v-col>
          </v-row>
          <v-row align="center">
            <v-col class="display-1" cols="6">
              Messages:
            </v-col>
            <v-col class="display-1" cols="6">
              {{ stats.messages == undefined ? "--" : stats.messages }} 🗨️
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="resetStats">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
    ...mapActions("elementalChat", [
      "listChannels",
      "updateHandle",
      "getStats",
      "resetStats"
    ]),
    ...mapActions(["holoLogout"]),
    openChannel() {
      this.refreshKey += 1;
    },
    channelAdded() {
      this.showAdd = false;
    },
    visitPocPage() {
      window.open("https://holo.host/faq-tag/elemental-chat/", "_blank");
    }
  },
  computed: {
    ...mapState(["conductorDisconnected"]),
    ...mapState(["appInterface"]),
    ...mapState("elementalChat", [
      "channels",
      "channel",
      "stats",
      "showStats",
      "statsLoading"
    ]),
    ...mapState(["isHoloSignedIn"]),
    shouldDisplayStats() {
      return this.showStats;
    },
    statsAreLoading() {
      return this.statsLoading;
    }
  },
  watch: {
    conductorDisconnected(val) {
      if (!val) this.listChannels({ category: "General" });
    }
  }
};
</script>
<style scoped>
.logout {
  font-size: 14px;
  margin-right: 10px;
  margin-top: 5px;
  cursor: pointer;
}
.no-wrap {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lime {
  background-color: #d7ea44;
}
.underline {
  text-decoration: underline;
}
.title-logo {
  margin: -5px;
  padding: 3px;
}
.link-text {
  color: #5c007a !important;
}
.black-text {
  color: black !important;
}
.banner-text {
  margin-top: 0%;
  margin-bottom: -6px;
}
</style>
