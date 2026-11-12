import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, Check, Search, User, Users, X } from "lucide-react";
import { toast } from "react-toastify";
import { createGroup } from "../api/groupsThunk";
import { addChat, selectChat } from "../store/chatReducer";
import { searchUserThunk } from "../../users/api/usersThunk";
import { clearUser } from "../../users/store/usersReducer";
import { useAppShell } from "../../../shared/layout/useAppShell";

// A group is at most 10 members: the creator + 9 picked contacts.
const MAX_MEMBERS = 10;

const CreateGroupModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { openConversation } = useAppShell();

  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]); // [{ id, name, phoneNumber, profilePic }]
  const [creating, setCreating] = useState(false);

  const { user: searchResult, loading: searchLoading } = useSelector(
    (state) => state.users,
  );

  // Existing contacts to prefill the picker (people this user already
  // chats with), so most groups need no phone-number hunting.
  const chats = useSelector((state) => state.chat.chats);
  const suggestedContacts = useMemo(
    () =>
      chats
        .filter((chat) => chat.chatType !== "group" && chat.otherUserId)
        .map((chat) => ({
          id: chat.otherUserId,
          name: chat.name,
          phoneNumber: chat.phoneNumber,
          profilePic: chat.profilePic || chat.avatarUrl,
        })),
    [chats],
  );

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

  const isAlreadyInChat = (userId) =>
    suggestedContacts.some((contact) => contact.id === userId);

  const toggleMember = (person) => {
    setSelected((prev) => {
      if (prev.some((p) => p.id === person.id)) {
        return prev.filter((p) => p.id !== person.id);
      }
      if (prev.length + 1 > MAX_MEMBERS - 1) {
        toast.info(`Groups can have at most ${MAX_MEMBERS} members`);
        return prev;
      }
      return [...prev, person];
    });
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Give the group a name");
      return;
    }
    if (creating) return;

    setCreating(true);
    try {
      const res = await dispatch(
        createGroup({
          name: trimmed,
          memberIds: selected.map((member) => member.id),
        }),
      ).unwrap();

      // Show the new conversation immediately; the background
      // fetchMyChats reconciliation keeps everything else in sync.
      const chat = {
        id: res.conversationId,
        chatType: "group",
        name: res.name || trimmed,
        groupName: res.name || trimmed,
        myRole: "admin",
        members: (res.members || []).map((member) => ({
          userId: member.userId,
          displayName: member.displayName,
          role: member.role,
          avatarUrl: member.avatarUrl,
        })),
        memberCount: (res.members || []).length,
        message: "Group created 🎉",
        time: "Now",
      };
      dispatch(addChat(chat));
      dispatch(selectChat(chat));
      openConversation();

      toast.success("Group created");
      handleClose();
    } catch (err) {
      toast.error(typeof err === "string" ? err : err?.message || "Could not create the group");
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setName("");
    setSearch("");
    setSelected([]);
    dispatch(clearUser());
    onClose();
  };

  if (!isOpen) return null;

  const searchPerson = searchResult
    ? {
        id: searchResult.id,
        name: searchResult.name || searchResult.displayName || searchResult.phoneNumber,
        phoneNumber: searchResult.phoneNumber,
        profilePic: searchResult.profilePic,
      }
    : null;

  // Suggested contacts; a searched user renders separately above and is
  // hidden from this list if they are already a contact.
  const suggestions = suggestedContacts.filter(
    (contact) => contact.id !== searchPerson?.id,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[calc(100%-1.5rem)] max-w-2xl h-[75vh] md:h-[80vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 h-16 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition"
              aria-label="Close"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base font-bold text-teal-600">New Group</h1>
            <span className="text-xs text-gray-400">
              {selected.length + 1}/{MAX_MEMBERS}
            </span>
          </div>
        </div>

        {/* Group name */}
        <div className="px-6 pt-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
              <Users size={20} className="text-teal-600" />
            </div>
            <input
              type="text"
              placeholder="Group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-gray-100 text-gray-800 outline-none focus:ring-2 focus:ring-teal-500/40"
            />
          </div>
        </div>

        {/* Selected member chips */}
        {selected.length > 0 && (
          <div className="px-6 pt-3 flex flex-wrap gap-2 shrink-0 max-h-24 overflow-y-auto">
            {selected.map((member) => (
              <span
                key={member.id}
                className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-medium"
              >
                {member.name}
                <button
                  type="button"
                  onClick={() => toggleMember(member)}
                  className="w-4 h-4 rounded-full bg-teal-200 hover:bg-teal-300 flex items-center justify-center"
                  aria-label={`Remove ${member.name}`}
                >
                  <X size={10} className="text-teal-800" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="px-6 pt-4 shrink-0">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Add members — search by phone number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-full bg-gray-100 text-gray-700 outline-none"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {searchLoading && (
            <p className="text-sm text-gray-400 text-center py-3">Searching…</p>
          )}

          {/* Search result (any user by phone) */}
          {searchPerson && !isAlreadyInChat(searchPerson.id) && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
              <button
                type="button"
                onClick={() => toggleMember(searchPerson)}
                disabled={selected.some((p) => p.id === searchPerson.id)}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-gray-50 transition"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {searchPerson.profilePic ? (
                    <img src={searchPerson.profilePic} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={18} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{searchPerson.name}</p>
                  <p className="text-xs text-gray-400">{searchPerson.phoneNumber}</p>
                </div>
                {selected.some((p) => p.id === searchPerson.id) && (
                  <Check size={18} className="text-teal-600" />
                )}
              </button>
            </div>
          )}

          {/* Suggestions: existing contacts */}
          {suggestions.length > 0 && (
            <>
              <div className="flex items-center gap-3 mb-2 mt-2">
                <span className="text-[11px] font-bold text-gray-300 tracking-widest">
                  YOUR CONTACTS
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="space-y-1">
                {suggestions.map((contact) => {
                  const isSelected = selected.some((p) => p.id === contact.id);
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => toggleMember(contact)}
                      className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-left transition ${
                        isSelected ? "bg-teal-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {contact.profilePic ? (
                          <img src={contact.profilePic} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-500 font-semibold">
                            {contact.name?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{contact.name}</p>
                        <p className="text-xs text-gray-400">{contact.phoneNumber}</p>
                      </div>
                      <span
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-teal-500 border-teal-500 text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {!searchPerson && suggestions.length === 0 && !searchLoading && (
            <div className="text-center py-10 text-gray-300">
              <Users size={30} className="mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-400">
                Search by phone number to add members
              </p>
            </div>
          )}
        </div>

        {/* Create */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition"
          >
            {creating ? "Creating…" : `Create group${selected.length ? ` (${selected.length + 1})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
