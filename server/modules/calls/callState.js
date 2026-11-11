// Shared in-process call registry used by both the 1:1 (P2P) and the
// group (SFU) call socket modules. Keeping the state here lets either
// module ask "is this user already in a call?" — of either type —
// without a circular require between them.

// callId -> active 1:1 call (see call.socket.js)
const activeCalls = new Map();

// userId -> group callId (see groupCall.socket.js)
const groupCallsByUser = new Map();

function findActiveCallForUser(userId) {
  for (const call of activeCalls.values()) {
    if (call.callerId === userId || call.calleeId === userId) return call;
  }
  return null;
}

function isUserIn1to1Call(userId) {
  return Boolean(findActiveCallForUser(userId));
}

function isUserInGroupCall(userId) {
  return groupCallsByUser.has(String(userId));
}

function isUserInAnyCall(userId) {
  return isUserIn1to1Call(userId) || isUserInGroupCall(userId);
}

module.exports = {
  activeCalls,
  groupCallsByUser,
  findActiveCallForUser,
  isUserIn1to1Call,
  isUserInGroupCall,
  isUserInAnyCall,
};
