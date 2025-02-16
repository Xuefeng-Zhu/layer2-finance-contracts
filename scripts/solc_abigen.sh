# script for solc/abigen solidity files
# below env variables are set by github action

# PRID: ${{ github.event.number }}
# BRANCH: ${{ github.head_ref }}
# GH_TOKEN: ${{ secrets.GH_TOKEN }}

SOLC_VER="v0.7.6+commit.7338295f"                    # our .sol has < 0.8.0 due to OPENZEPPELIN isn't up to date
OPENZEPPELIN="openzeppelin-contracts-3.4.0"          # if change, also need to change the url in dld_solc
GETH_VER="geth-alltools-linux-amd64-1.9.25-e7872729" # for abigen
GO_REPO=https://${GH_TOKEN}@github.com/celer-network/defi-rollup

# xx.sol under contracts/, no need for .sol suffix, if sol file is in subfolder, just add the relative path
# note solc will put all .abi/.bin under genfiles folder (ie. flatten folder hierarchy), so make sure no file name conflict
solFiles=(
  Registry
  TransitionDisputer
  TransitionEvaluator
  RollupChain
  # strategies
  strategies/interfaces/IStrategy
  strategies/StrategyDummy
)

dld_solc() {
  curl -L "https://binaries.soliditylang.org/linux-amd64/solc-linux-amd64-${SOLC_VER}" -o solc && chmod +x solc
  sudo mv solc /usr/local/bin/
  # below will create $OPENZEPPELIN/contracts folder
  curl -L "https://github.com/OpenZeppelin/openzeppelin-contracts/archive/v3.4.0.tar.gz" | tar -xz -C contracts $OPENZEPPELIN/contracts/
}

run_solc() {
  mkdir -p genfiles
  for f in ${solFiles[@]}; do
    solc --base-path $PWD --allow-paths contracts --overwrite --optimize --abi --bin -o genfiles '@openzeppelin/'=contracts/$OPENZEPPELIN/ contracts/$f.sol
  done
}

dld_abigen() {
  curl -sL https://gethstore.blob.core.windows.net/builds/$GETH_VER.tar.gz | sudo tar -xz -C /usr/local/bin --strip 1 $GETH_VER/abigen
  sudo chmod +x /usr/local/bin/abigen
}

run_abigen() {
  PR_COMMIT_ID=$(git rev-parse --short HEAD)
  git clone $GO_REPO
  pushd defi-rollup
  git fetch
  git checkout $BRANCH || git checkout -b $BRANCH

  for f in ${solFiles[@]}; do
    abigen_one ${f##*/} # delete subfolder only keep file name, eg. strategies/interfaces/IStrategy -> IStrategy
  done

  # delete duplicated struct defs, add here if new dup appears
  del_dup_structs contracts/transitiondisputer.go DataTypesAccountInfo
  del_dup_structs contracts/transitiondisputer.go DataTypesAccountProof
  del_dup_structs contracts/transitiondisputer.go DataTypesStrategyInfo
  del_dup_structs contracts/transitiondisputer.go DataTypesStrategyProof
  del_dup_structs contracts/transitiondisputer.go DataTypesTransitionProof

  del_dup_structs contracts/transitionevaluator.go DataTypesAccountInfo
  del_dup_structs contracts/transitionevaluator.go DataTypesStrategyInfo
  del_dup_structs contracts/transitionevaluator.go DataTypesDepositTransition
  del_dup_structs contracts/transitionevaluator.go DataTypesWithdrawTransition
  del_dup_structs contracts/transitionevaluator.go DataTypesUncommitTransition
  del_dup_structs contracts/transitionevaluator.go DataTypesCommitTransition
  del_dup_structs contracts/transitionevaluator.go DataTypesBalanceSyncTransition
  del_dup_structs contracts/transitionevaluator.go DataTypesCommitmentSyncTransition

  pushd contracts
  go build # make sure contracts pkg can build
  popd

  if [[ $(git status --porcelain) ]]; then
    echo "Sync-ing go binding"
    git add .
    git commit -m "Sync go binding based on rollup contract PR $PRID" -m "defi-rollup-contract commit: $PR_COMMIT_ID"
    git push origin $BRANCH
  fi
  popd
}

# all contracts go binding are under defi-rollup/contracts/ folder and has `package contracts`
abigen_one() {
  gofile=$(echo $1 | tr '[:upper:]' '[:lower:]')
  mkdir -p contracts
  abigen -abi ../genfiles/$1.abi -bin ../genfiles/$1.bin -pkg contracts -type $1 -out contracts/$gofile.go
}

# $1 is go file path, $2 is struct name
# will delete type $2 struct {...} from $1
del_dup_structs() {
  sed -i -e "/type $2 struct {/,/}/d" $1
}

setup_git() {
  git config --global user.email "build@celer.network"
  git config --global user.name "Build Bot"
  git config --global push.default "current"
}
