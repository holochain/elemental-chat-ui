#!/bin/bash
hc sandbox clean
hc sandbox generate ./tests/integration/setup/bundle/elemental-chat.happ -a='elemental-chat-1' network --bootstrap https://bootstrap-staging.holo.host/ quic -p=kitsune-proxy://f3gH2VMkJ4qvZJOXx0ccL_Zo5n-s_CnBjSzAsEHHDCA/kitsune-quic/h/167.172.0.245/p/5788/--
hc sandbox generate ./tests/integration/setup/bundle/elemental-chat.happ -a='elemental-chat-1' network --bootstrap https://bootstrap-staging.holo.host/ quic -p=kitsune-proxy://f3gH2VMkJ4qvZJOXx0ccL_Zo5n-s_CnBjSzAsEHHDCA/kitsune-quic/h/167.172.0.245/p/5788/--