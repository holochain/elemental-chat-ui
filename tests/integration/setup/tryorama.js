import { WEB_CLIENT_PORT } from '@/consts'
import {
  Orchestrator,
  Config,
  TransportConfigType,
  ProxyConfigType,
  combine,
  localOnly
} from '@holochain/tryorama'

const path = require('path')

const appPort = parseInt(WEB_CLIENT_PORT)

export const orchestrator = new Orchestrator({ middleware: combine(localOnly) })
export const conductorConfig = Config.gen({ appPort })
export const elChatDna = path.join(__dirname, '../../../dnas/elemental-chat.dna.gz')
