
# Note: DNA specified here must have membrane proofs disabled
curl -LJ https://github.com/holochain/elemental-chat/releases/download/v0.2.6/elemental-chat.dna -o ./dnas/elemental-chat.dna
curl -LJ https://github.com/holochain/elemental-chat/releases/download/v0.2.6/elemental-chat.happ -o ./dnas/elemental-chat.happ
curl -LJ https://holo-host.github.io/servicelogger-rsm/releases/downloads/0_2_2/servicelogger.0_2_2.happ -o ./dnas/servicelogger.happ
curl -LJ https://holo-host.github.io/servicelogger-rsm/releases/downloads/0_2_2/servicelogger.0_2_2.happ -o ./dnas/servicelogger.happ

mkdir -p ./tmp

curl -LJ https://holo-host.github.io/envoy-chaperone/releases/0_1_0/holo-dev-server-x86_64-unknown-linux-gnu.tar.gz -o ./tmp/holo-dev-server.tar.gz

cd tmp

tar -xf ./holo-dev-server.tar.gz holo-dev-server-x86_64-unknown-linux-gnu/holo-dev-server
mv ./holo-dev-server-x86_64-unknown-linux-gnu/holo-dev-server ./holo-dev-server
rm -r ./holo-dev-server-x86_64-unknown-linux-gnu
rm -r ./holo-dev-server.tar.gz