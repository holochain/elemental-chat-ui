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

const appPort = WEB_CLIENT_PORT

// Note: this is a copy of the network config used in ec dna tests
const network = {
  bootstrap_service: 'https://bootstrap.holo.host',
  transport_pool: [
    {
      type: TransportConfigType.Proxy,
      sub_transport: { type: TransportConfigType.Quic },
      proxy_config: {
        type: ProxyConfigType.RemoteProxyClient,
        proxy_url:
          'kitsune-proxy://CIW6PxKxsPPlcuvUCbMcKwUpaMSmB7kLD8xyyj4mqcw/kitsune-quic/h/165.22.32.11/p/5778/--'
      }
    }
  ],
  tuning_params: {
    gossip_loop_iteration_delay_ms: 200, // default 10
    default_notify_remote_agent_count: 5, // default 5
    default_notify_timeout_ms: 100, // default 1000
    default_rpc_single_timeout_ms: 20000, // default 2000
    default_rpc_multi_remote_agent_count: 2, // default 2
    default_rpc_multi_timeout_ms: 2000, // default 2000
    agent_info_expires_after_ms: 1000 * 60 * 20 // default 1000 * 60 * 20 (20 minutes)
  }
}

export const orchestrator = new Orchestrator({ middleware: combine(localOnly) })
export const conductorConfig = Config.gen({ network, appPort })
export const elChatDna = path.join(__dirname, '../../../dnas/elemental-chat.dna.gz')
