import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Archive,
  ArrowUpCircle,
  Bell,
  BellOff,
  Calendar,
  Check,
  Crown,
  Images,
  LogOut,
  Pencil,
  Phone,
  Play,
  Plus,
  Search,
  UserMinus,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import useAuth from "../../auth/hooks/useAuth";
import { useChat } from "../hooks/useChat";
import { useGroupCall } from "../../calls/hooks/useGroupCall";
import {
  fetchGroupInfo,
  leaveGroup,
  removeGroupMember,
  renameGroup,
  addGroupMembers,
} from "../api/groupsThunk";
import { renameChat, removeChat } from "../store/chatReducer";
import { searchUserThunk } from "../../users/api/usersThunk";
import { clearUser } from "../../users/store/usersReducer";
import { getAvatarGradient } from "../../../shared/utils/avatarGradient";
import MediaViewer from "./MediaViewer";

const MAX_SHARED_MEDIA = 5;

const formatCreatedDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const GroupInfoPane = ({ chat, onClose }) => {
  const dispatch = useDispatch();
  const { user: me } = useAuth();
  const { startGroupCall } = useGroupCall();
  const { archiveChat, unarchiveChat, setMuted, tab, messages } = useChat();

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [search, setSearch] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [memberAvatarErrors, setMemberAvatarErrors] = useState({});
  const [viewerItem, setViewerItem] = useState(null);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Sync transient state when active chat changes without cascading render warnings
  const [prevChatId, setPrevChatId] = useState(chat?.id);
  if (chat?.id !== prevChatId) {
    setPrevChatId(chat?.id);
    setAvatarFailed(false);
    setMemberAvatarErrors({});
    setViewerItem(null);
    setMemberToRemove(null);
    setShowLeaveConfirm(false);
    setShowAddMembers(false);
    setRenaming(false);
  }

  const { user: searchResult, loading: searchLoading } = useSelector(
    (state) => state.users,
  );

  const conversationId = chat?.id;
  const isAdmin = info?.myRole === "admin";
  const avatarUrl = chat?.profilePic || chat?.avatarUrl;
  const isMuted = Boolean(chat?.isMuted ?? chat?.is_muted);

  const load = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const data = await dispatch(fetchGroupInfo(conversationId)).unwrap();
      setInfo(data);
    } catch (err) {
      toast.error(
        typeof err === "string"
          ? err
          : err?.message || "Could not load group info",
      );
      onClose();
    } finally {
      setLoading(false);
    }
  }, [conversationId, dispatch, onClose]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (search.trim().length >= 6) {
        dispatch(searchUserThunk({ phoneNumber: search.trim() }));
      } else {
        dispatch(clearUser());
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [search, dispatch]);

  const startAudioCall = () =>
    startGroupCall({ conversationId, name: chat?.name, callType: "audio" });

  const startVideoCall = () =>
    startGroupCall({ conversationId, name: chat?.name, callType: "video" });

  const handleToggleMute = () => {
    if (!conversationId) return;
    setMuted(conversationId, !isMuted);
  };

  const handleRename = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === (info?.name || chat?.name)) {
      setRenaming(false);
      return;
    }
    try {
      await dispatch(renameGroup({ conversationId, name: trimmed })).unwrap();
      dispatch(renameChat({ conversationId, name: trimmed }));
      setInfo((prev) => (prev ? { ...prev, name: trimmed } : prev));
      setRenaming(false);
      toast.success("Group renamed");
    } catch (err) {
      toast.error(
        typeof err === "string"
          ? err
          : err?.message || "Could not rename group",
      );
    }
  };

  const handleRemoveMember = async (userId, displayName) => {
    try {
      await dispatch(removeGroupMember({ conversationId, userId })).unwrap();
      setInfo((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.filter(
                (m) => String(m.userId) !== String(userId),
              ),
            }
          : prev,
      );
      toast.info(`${displayName} removed from the group`);
      load();
    } catch (err) {
      toast.error(
        typeof err === "string"
          ? err
          : err?.message || "Could not remove member",
      );
    }
  };

  const handleAddMember = async (userId) => {
    try {
      await dispatch(
        addGroupMembers({ conversationId, memberIds: [userId] }),
      ).unwrap();
      toast.success("Member added to group");
      setSearch("");
      dispatch(clearUser());
      load();
    } catch (err) {
      toast.error(
        typeof err === "string" ? err : err?.message || "Could not add member",
      );
    }
  };

  const handleLeave = async () => {
    try {
      await dispatch(leaveGroup(conversationId)).unwrap();
      toast.info("You left the group");
      dispatch(removeChat(conversationId));
      onClose();
    } catch (err) {
      toast.error(
        typeof err === "string" ? err : err?.message || "Could not leave group",
      );
    }
  };

  // Shared media from this group conversation
  const { items: mediaItems, total: mediaTotal } = useMemo(() => {
    const all = (messages || []).filter(
      (m) =>
        m?.secure_url &&
        (m.mime_type?.startsWith("image/") ||
          m.mime_type?.startsWith("video/")),
    );
    return {
      total: all.length,
      items: all.slice(-MAX_SHARED_MEDIA).reverse(),
    };
  }, [messages]);

  const creator = useMemo(() => {
    if (!info?.createdBy || !info?.members) return null;
    return info.members.find(
      (m) => String(m.userId) === String(info.createdBy),
    );
  }, [info?.createdBy, info?.members]);

  const creatorDisplayName = useMemo(() => {
    if (!creator) return null;
    return String(creator.userId) === String(me?.id)
      ? "you"
      : creator.displayName;
  }, [creator, me?.id]);

  const isAlreadyMember = Boolean(
    searchResult &&
    (info?.members || []).some(
      (m) => String(m.userId) === String(searchResult.id),
    ),
  );

  const memberCount = info?.members?.length ?? chat?.memberCount ?? 0;

  if (!chat) return null;

  return (
    <div className="h-dvh flex flex-col shadow-2xl bg-[#f0f2f5] border-l border-gray-200 w-full sm:w-90 md:w-95 max-w-[100vw]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-16 shrink-0 bg-white border-b border-gray-100">
        <h2 className="font-bold text-gray-900 text-[15px]">Group Info</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          aria-label="Close group info"
        >
          <X size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-3 animate-pulse">
          <div className="bg-white rounded-2xl px-5 py-6 flex flex-col items-center shadow-xs border border-gray-100/60">
            <div className="w-24 h-24 rounded-full bg-gray-200" />
            <div className="h-5 w-32 bg-gray-200 rounded-md mt-4" />
            <div className="h-3 w-20 bg-gray-100 rounded-md mt-2" />
            <div className="grid grid-cols-2 gap-2.5 w-full mt-4 pt-3 border-t border-gray-50">
              <div className="h-9 bg-gray-100 rounded-xl" />
              <div className="h-9 bg-gray-100 rounded-xl" />
            </div>
          </div>
          <div className="bg-white rounded-2xl px-5 py-4 shadow-xs border border-gray-100/60 flex flex-col gap-3">
            <div className="h-3 w-16 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-100 rounded-xl" />
            <div className="h-10 bg-gray-100 rounded-xl" />
          </div>
          <div className="bg-white rounded-2xl px-5 py-4 shadow-xs border border-gray-100/60 flex flex-col gap-3">
            <div className="h-3 w-20 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-100 rounded-xl" />
            <div className="h-10 bg-gray-100 rounded-xl" />
          </div>
        </div>
      ) : (
        <div className="overflow-y-auto flex-1 flex flex-col gap-3 p-3">
          {/* Hero Card */}
          <div className="bg-white rounded-2xl px-5 py-6 flex flex-col items-center shadow-xs border border-gray-100/60">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold shadow-md ring-4 ring-white overflow-hidden shrink-0"
              style={{
                background:
                  avatarUrl && !avatarFailed
                    ? undefined
                    : getAvatarGradient(String(chat?.id || info?.name || "")),
              }}
            >
              {avatarUrl && !avatarFailed ? (
                <img
                  src={avatarUrl}
                  alt={info?.name || chat?.name}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <Users size={36} className="text-white drop-shadow-xs" />
              )}
            </div>

            {/* Title & Rename */}
            {renaming ? (
              <div className="flex items-center gap-1.5 w-full mt-4">
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                    if (e.key === "Escape") setRenaming(false);
                  }}
                  maxLength={100}
                  placeholder="Group name"
                  className="flex-1 px-3 py-1.5 text-sm font-medium rounded-xl bg-gray-50 border border-gray-200 text-gray-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                />
                <button
                  type="button"
                  onClick={handleRename}
                  className="w-8 h-8 rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center shadow-xs transition active:scale-95 shrink-0"
                  aria-label="Save name"
                >
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setRenaming(false)}
                  className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition active:scale-95 shrink-0"
                  aria-label="Cancel rename"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 mt-4 max-w-full">
                <h3
                  className="font-bold text-gray-900 text-center truncate max-w-55"
                  style={{ fontSize: 18 }}
                  title={info?.name || chat?.name}
                >
                  {info?.name || chat?.name}
                </h3>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(info?.name || chat?.name || "");
                      setRenaming(true);
                    }}
                    className="p-1.5 rounded-full text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition shrink-0"
                    aria-label="Rename group"
                    title="Rename group"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Member count badge */}
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
              <span className="font-medium">Group</span>
              <span>•</span>
              <span>
                {memberCount} {memberCount === 1 ? "member" : "members"} (max
                10)
              </span>
            </div>

            {/* Created info */}
            {(info?.createdAt || creatorDisplayName) && (
              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1 text-center justify-center">
                <Calendar size={12} className="shrink-0" />
                <span>
                  {info?.createdAt &&
                    `Created ${formatCreatedDate(info.createdAt)}`}
                  {creatorDisplayName && ` by ${creatorDisplayName}`}
                </span>
              </p>
            )}

            {/* Quick group call actions */}
            <div className="grid grid-cols-2 gap-2.5 w-full mt-4 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={startAudioCall}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-teal-50/80 hover:bg-teal-100/90 text-teal-700 text-xs font-semibold border border-teal-100 transition active:scale-95"
              >
                <Phone size={15} className="text-teal-600" />
                <span>Voice Call</span>
              </button>
              <button
                type="button"
                onClick={startVideoCall}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-teal-50/80 hover:bg-teal-100/90 text-teal-700 text-xs font-semibold border border-teal-100 transition active:scale-95"
              >
                <Video size={15} className="text-teal-600" />
                <span>Video Call</span>
              </button>
            </div>
          </div>

          {/* Shared Media */}
          {mediaItems.length > 0 && (
            <div className="bg-white rounded-2xl px-5 py-4 shadow-xs border border-gray-100/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Images size={13} className="text-gray-400" />
                  <p className="text-xs font-semibold tracking-widest text-gray-400">
                    MEDIA
                  </p>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">
                  {mediaTotal}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {mediaItems.map((item) => {
                  const isVideo = item.mime_type?.startsWith("video/");
                  return (
                    <button
                      key={item.id || item.client_msg_id}
                      type="button"
                      onClick={() => setViewerItem(item)}
                      className="relative aspect-square rounded-lg overflow-hidden bg-gray-100
                        active:scale-95 transition touch-manipulation cursor-zoom-in"
                      aria-label="View shared media"
                    >
                      {isVideo ? (
                        <video
                          src={item.secure_url}
                          muted
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={item.secure_url}
                          alt="Shared media"
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      )}

                      {isVideo && (
                        <span
                          className="absolute inset-0 flex items-center justify-center
                            bg-black/30 text-white"
                        >
                          <Play size={18} fill="currentColor" />
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Overflow tile */}
                {mediaTotal - MAX_SHARED_MEDIA > 0 && (
                  <div
                    className="aspect-square rounded-lg overflow-hidden bg-gray-100
                      flex flex-col items-center justify-center gap-0.5 text-gray-500"
                  >
                    <Images size={16} />
                    <span className="text-xs font-semibold text-gray-600">
                      +{mediaTotal - MAX_SHARED_MEDIA}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Group Settings / Actions */}
          <div className="bg-white rounded-2xl px-5 py-4 shadow-xs border border-gray-100/60">
            <p className="text-xs font-semibold tracking-widest text-gray-400 mb-3">
              SETTINGS
            </p>

            <div className="space-y-1">
              <ActionItem
                icon={isMuted ? <Bell size={16} /> : <BellOff size={16} />}
                label={isMuted ? "Unmute Notifications" : "Mute Notifications"}
                iconBg="bg-amber-100"
                iconColor="text-amber-600"
                onClick={handleToggleMute}
              />

              {tab === "chats" ? (
                <ActionItem
                  icon={<Archive size={16} />}
                  label="Archive Group"
                  iconBg="bg-orange-100"
                  iconColor="text-orange-500"
                  onClick={() => {
                    archiveChat(chat.id);
                    onClose();
                  }}
                />
              ) : (
                <ActionItem
                  icon={<ArrowUpCircle size={16} />}
                  label="Unarchive Group"
                  iconBg="bg-teal-100"
                  iconColor="text-teal-600"
                  onClick={() => {
                    unarchiveChat(chat.id);
                    onClose();
                  }}
                />
              )}
            </div>
          </div>

          {/* Members Roster Card */}
          <div className="bg-white rounded-2xl px-5 py-4 shadow-xs border border-gray-100/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold tracking-widest text-gray-400">
                  MEMBERS
                </p>
                <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {memberCount}/10
                </span>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMembers((prev) => !prev);
                    setSearch("");
                    dispatch(clearUser());
                  }}
                  disabled={memberCount >= 10}
                  className={`text-xs font-semibold flex items-center gap-1 transition ${
                    memberCount >= 10
                      ? "text-gray-300 cursor-not-allowed"
                      : showAddMembers
                        ? "text-gray-500 hover:text-gray-700"
                        : "text-teal-600 hover:text-teal-700"
                  }`}
                >
                  {showAddMembers ? (
                    <>
                      <X size={13} />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      Add Member
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Admin Add Member Inline Panel */}
            {isAdmin && showAddMembers && (
              <div className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-2.5">
                <div className="relative flex items-center">
                  <Search
                    size={14}
                    className="absolute left-3 text-gray-400 pointer-events-none"
                  />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by phone number"
                    className="w-full pl-8 pr-7 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-200 text-gray-900 placeholder-gray-400 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        dispatch(clearUser());
                      }}
                      className="absolute right-2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {searchLoading && (
                  <div className="flex items-center justify-center gap-2 py-2 text-xs text-gray-400">
                    <div className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    <span>Searching…</span>
                  </div>
                )}

                {searchResult && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-gray-100 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold overflow-hidden shrink-0"
                        style={{
                          background: getAvatarGradient(
                            String(searchResult.id),
                          ),
                        }}
                      >
                        {searchResult.profilePic ? (
                          <img
                            src={searchResult.profilePic}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (searchResult.name || "U").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {searchResult.name}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">
                          {searchResult.phoneNumber}
                        </p>
                      </div>
                    </div>

                    {isAlreadyMember ? (
                      <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-md shrink-0">
                        Added
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddMember(searchResult.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 shrink-0"
                      >
                        <UserPlus size={13} />
                        Add
                      </button>
                    )}
                  </div>
                )}

                {search.trim().length >= 6 &&
                  !searchLoading &&
                  !searchResult && (
                    <p className="text-[11px] text-gray-400 text-center py-1">
                      No user found with this phone number
                    </p>
                  )}
              </div>
            )}

            {/* Members List */}
            <div className="space-y-1">
              {(info?.members || []).map((member) => {
                const isMe = String(member.userId) === String(me?.id);
                const removable = isAdmin && !isMe && member.role !== "admin";
                const hasAvatar =
                  member.avatarUrl && !memberAvatarErrors[member.userId];

                return (
                  <div
                    key={member.userId}
                    className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition group"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden shrink-0 shadow-xs"
                      style={{
                        background: hasAvatar
                          ? undefined
                          : getAvatarGradient(String(member.userId)),
                      }}
                    >
                      {hasAvatar ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.displayName}
                          className="w-full h-full object-cover"
                          onError={() =>
                            setMemberAvatarErrors((prev) => ({
                              ...prev,
                              [member.userId]: true,
                            }))
                          }
                        />
                      ) : (
                        <span className="text-sm font-semibold">
                          {(member.displayName || "U").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {isMe ? "You" : member.displayName}
                        </p>
                        {isMe && (
                          <span className="text-[10px] text-gray-400 font-medium">
                            (you)
                          </span>
                        )}
                      </div>
                      {member.phoneNumber && (
                        <p className="text-xs text-gray-400 truncate">
                          {member.phoneNumber}
                        </p>
                      )}
                    </div>

                    {member.role === "admin" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200/60 rounded-full px-2 py-0.5 shrink-0">
                        <Crown size={10} className="text-teal-600" />
                        Admin
                      </span>
                    )}

                    {removable && (
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(member)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition opacity-80 group-hover:opacity-100"
                        aria-label={`Remove ${member.displayName}`}
                        title={`Remove ${member.displayName}`}
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-2xl px-5 py-4 shadow-xs border border-gray-100/60">
            <p className="text-xs font-semibold tracking-widest text-gray-400 mb-3">
              DANGER ZONE
            </p>
            <div className="space-y-1">
              <ActionItem
                icon={<LogOut size={16} />}
                label="Leave Group"
                iconBg="bg-red-100"
                iconColor="text-red-500"
                labelColor="text-red-500"
                onClick={() => setShowLeaveConfirm(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Media Lightbox */}
      {viewerItem && (
        <MediaViewer
          url={viewerItem.secure_url}
          mimeType={viewerItem.mime_type}
          onClose={() => setViewerItem(null)}
        />
      )}

      {/* Confirmation Modal: Remove Member */}
      {memberToRemove && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setMemberToRemove(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
              <UserMinus size={22} />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-gray-900 text-base">
                Remove Member?
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Are you sure you want to remove{" "}
                <span className="font-semibold text-gray-800">
                  {memberToRemove.displayName}
                </span>{" "}
                from this group?
              </p>
            </div>
            <div className="flex gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                className="flex-1 py-2.5 px-3 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRemoveMember(
                    memberToRemove.userId,
                    memberToRemove.displayName,
                  );
                  setMemberToRemove(null);
                }}
                className="flex-1 py-2.5 px-3 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-xs cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Leave Group */}
      {showLeaveConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowLeaveConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
              <LogOut size={22} />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-gray-900 text-base">
                Leave Group?
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                You will no longer be able to send or receive messages in this
                group.
              </p>
            </div>
            <div className="flex gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2.5 px-3 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveConfirm(false);
                  handleLeave();
                }}
                className="flex-1 py-2.5 px-3 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-xs cursor-pointer"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionItem = ({
  icon,
  label,
  iconBg,
  iconColor,
  labelColor,
  onClick,
}) => (
  <div
    onClick={onClick}
    className="flex items-center gap-3 px-2 py-2.5 rounded-xl cursor-pointer hover:bg-gray-50 transition group"
  >
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}
    >
      {icon}
    </div>
    <span
      className={`text-sm font-medium ${labelColor || "text-gray-700"} group-hover:text-gray-900`}
    >
      {label}
    </span>
  </div>
);

export default GroupInfoPane;
