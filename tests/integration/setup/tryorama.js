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
    gossip_strategy: "sharded-gossip",
    gossip_loop_iteration_delay_ms: 2000,
    default_notify_remote_agent_count:  5,
    default_notify_timeout_ms: 1000 * 30,
    default_rpc_single_timeout_ms: 1000 * 30,
    default_rpc_multi_remote_agent_count: 1,
    default_rpc_multi_timeout_ms: 1000 * 30,
    agent_info_expires_after_ms: 1000 * 60 * 20,
    tls_in_mem_session_storage: 512,
    proxy_keepalive_ms: 1000 * 60 * 2,
    proxy_to_expire_ms: 1000 * 60 * 5,
    concurrent_limit_per_thread: 4096,
    tx2_quic_max_idle_timeout_ms: 1000 * 30,
    tx2_pool_max_connection_count: 4096,
    tx2_channel_count_per_connection: 16,
    tx2_implicit_timeout_ms: 1000 * 30,
    tx2_initial_connect_retry_delay_ms: 200,
    default_rpc_multi_remote_request_grace_ms: 10,
    gossip_single_storage_arc_per_space: true
  }
}

export const orchestrator = new Orchestrator({ middleware: combine(localOnly) })
export const conductorConfig = Config.gen({ network, appPort })
export const elChatDna = path.join(__dirname, '../../../dnas/elemental-chat.dna.gz')
