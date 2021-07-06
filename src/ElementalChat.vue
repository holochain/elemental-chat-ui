<template>
  <div>
    <v-app-bar app dense dark tile elevation="5" aria-label="App Bar">
      <v-toolbar-title class="title pl-0 no-wrap">
        <img src="@/assets/chat.png" class="title-logo" aria-label="Elemental Chat Logo"/>
        <p role="title"  aria-label="Page Title"> Elemental Chat {{ channel.info.name ? "- " + channel.info.name : "" }} </p>
      </v-toolbar-title>
      <v-spacer></v-spacer>

      <v-toolbar-title v-if="isHoloAnonymous === false" @click="holoLogout" class="logout" aria-label="Logout with Holo">
        <span>Logout</span>
      </v-toolbar-title>
      <v-toolbar-title v-if="isHoloAnonymous === true" @click="holoLogin" class="login" aria-label="Log in with Holo">
        <span>Login</span>
      </v-toolbar-title>

      <v-toolbar-title class="title pl-0">
        <Identicon v-if="!isHoloHosted() || isHoloAnonymous === false" size="32" :holoHash="agentKey" role='img' aria-label="Agent Identity Icon"/>
        <v-toolbar-title class="handle" aria-label="Agent Handle">{{ handleToDisplay }}</v-toolbar-title>
        <v-tooltip v-if="isHoloAnonymous !== true" bottom aria-label="Agent Handle Tooltip">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              id="update-handle"
              color="action"
              icon
              v-bind="attrs"
              v-on="on"
              @click="editHandle()"
              small
              aria-label="Update Agent Handle"
            >
              <v-icon>mdi-account-cog</v-icon>
            </v-btn>
          </template>
          <span>Update user handle</span>
        </v-tooltip>
        <v-tooltip bottom aria-label="App Stats Tooltip">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              id="get-stats"
              color="action"
              icon
              v-bind="attrs"
              v-on="on"
              @click="handleShowStats"
              small
              aria-label="View App Stats"
            >
              <v-icon>mdi-chart-line</v-icon>
            </v-btn>
          </template>
          <span>View Stats</span>
        </v-tooltip>
        <v-tooltip bottom aria-label="App Version Tooltip">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              id="version"
              color="action"
              icon
              v-bind="attrs"
              v-on="on"
              small
              aria-label="App Version Button"
            >
              <v-icon>mdi-information-outline</v-icon>
            </v-btn>
          </template>
          <div v-if="!dnaHash">Loading Version Info...</div>
          <div v-if="dnaHash" aria-label="App UI Version Info">UI: {{ appVersion }}</div>
          <div v-if="dnaHash" aria-label="App DNA Version Info">DNA: ...{{ dnaHashTail }}</div>
          <div v-if="dnaHash && isHoloHosted()">Host: {{ hostUrl }}</div>
        </v-tooltip>
      </v-toolbar-title>
    </v-app-bar>
    <v-card dark outlined class="mb-1 v-application banner" role="banner" aria-label="POC Banner">
      <v-card-text class="pl-0 text-center lime black-text">
        <p class="banner-text">This is a proof of concept application, not intended for full production use. Read more in our
          <a @click="visitPocPage" class="underline link-text">Elemental Chat FAQs</a>
        </p>
      </v-card-text>
    </v-card>
    <v-card width="100%" class="fill-height pl-1 pt-1 pr-1">
      <v-row no-gutters height="100%">
        <Channels />
        <v-col cols="7" md="9">
          <v-card class="ma-0 pt-n1 pl-1" dark>
            <Messages :key="channel.entry.uuid" :channel="channel" />
          </v-card>
        </v-col>
      </v-row>
    </v-card>
    <v-dialog v-model="showingStats" persistent max-width="660" role='dialog' aria-label="App Statistics Dialog">
      <v-card>
        <v-card-title class="headline" aria-label="App Statistics Headline">
          Stats
        </v-card-title>
        <v-card-text v-if="statsAreLoading">Loading stats...</v-card-text>
        <v-card-text v-if="!statsAreLoading">
          <v-row align="center">
            <v-col class="display-1" cols="6" aria-label="App Statistics Title">
              Total peers:
            </v-col>
            <v-col class="display-1" cols="6">
              <span aria-label="App Total Peers">{{ stats.agentCount === undefined ? "--" : stats.agentCount }}</span> <span aria-label="Peer Icon">👤</span>
            </v-col>
          </v-row>
          <v-row align="center">
            <v-col class="display-1" cols="6" aria-label="App Statistics Title">
              Active peers:
            </v-col>
            <v-col class="display-1" cols="6">
              <span aria-label="App Active Peers">{{ stats.activeCount === undefined ? "--" : stats.activeCount }}</span> <span aria-label="Peer Icon">👤</span>
            </v-col>
          </v-row>
          <v-row align="center">
            <v-col class="display-1" cols="6" aria-label="App Statistics Title">
              Channels:
            </v-col>
            <v-col class="display-1" cols="6">
              <span aria-label="App Total Channels">{{ stats.channelCount === undefined ? "--" : stats.channelCount }}</span> <span aria-label="Message Icon">🗨️</span>
            </v-col>
          </v-row>
          <v-row align="center">
            <v-col class="display-1" cols="6" aria-label="App Statistics Title">
              Messages:
            </v-col>
            <v-col class="display-1" cols="6">
              <span aria-label="App Total Messages">{{ stats.messageCount === undefined ? "--" : stats.messageCount }}</span> <span aria-label="Message Icon">🗨️</span>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="showingStats = false" id="close-stats">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { mapState, mapActions, mapMutations, mapGetters } from 'vuex'
import { isHoloHosted } from '@/utils'

import Channels from './components/Channels.vue'
import Messages from './components/Messages.vue'
import Identicon from './components/Identicon.vue'

export default {
  name: 'ElementalChat',
  components: {
    Channels,
    Messages,
    Identicon
  },
  data () {
    return {
      showingStats: false
    }
  },
  methods: {
    ...mapMutations('elementalChat', ['setNeedsHandle']),
    ...mapActions('elementalChat', [
      'listAllMessages',
      'getStats',
      'getProfile',
      'updateProfile',
      'refreshChatter'
    ]),
    ...mapActions('holochain', ['holoLogout', 'holoLogin']),
    visitPocPage () {
      window.open('https://holo.host/faq-tag/elemental-chat/', '_blank')
    },
    handleShowStats () {
      this.getStats()
      this.showingStats = true
    },
    isHoloHosted () {
      return isHoloHosted()
    },
    editHandle () {
      this.setNeedsHandle(true)
    }
  },
  computed: {
    ...mapState('holochain', [
      'conductorDisconnected',
      'isHoloAnonymous',
      'dnaHash',
      'hostUrl',
      'agentKey',
      'dnaAlias',
      'holoStatus'
    ]),
    ...mapState('elementalChat', [
      'stats',
      'statsLoading',
      'agentHandle',
    ]),
    ...mapGetters('elementalChat', [
      'channel'
    ]),
    statsAreLoading () {
      return this.statsLoading
    },
    appVersion () {
      return process.env.VUE_APP_UI_VERSION
    },
    dnaHashTail () {
      const string = this.dnaHash.toString('base64')
      return string.slice(string.length - 6)
    },
    handleToDisplay () {
      return this.isHoloAnonymous ? 'anonymous' : this.agentHandle
    },
    canMakeZomeCalls() {
      return isHoloHosted() ? this.holoStatus === 'ready' : !this.conductorDisconnected
    }
  },
  created () {
    console.log('agentKey started as', this.agentKey)
  },
  watch: {
    canMakeZomeCalls (can) {
      console.log(`watcher activated: canMakeZomeCalls=${can}`)
      if (can) {
        this.listAllMessages()
        if (!(isHoloHosted() && this.isHoloAnonymous)) {
          this.getProfile()
          this.refreshChatter()
        }
      }
    }
  }
}
</script>
<style scoped>
.logout, .login {
  font-size: 14px;
  margin-right: 10px;
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
.title {
  display: flex;
  align-items: center;
}
.title-logo {
  width: 30px;
  margin-right: 5px;
}
.handle {
  font-size: 14px;
  margin-left: 12px;
  margin-right: 10px;
}
.link-text {
  color: #5c007a !important;
}
.black-text {
  color: black !important;
}
.banner-text {
  font-size: 15px;
  margin-bottom: -10px;
}
.banner {
  border-radius: 0px;
  box-shadow: 0px 10px 10px 2px rgba(128, 128, 0, 0.2),
    0px 10px 10px 2px rgba(128, 128, 0, 0.2),
    0px 10px 10px 2px rgba(128, 128, 0, 0.2) !important;
}
</style>
