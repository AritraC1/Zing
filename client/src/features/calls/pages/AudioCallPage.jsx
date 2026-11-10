import CallScreen from "../components/CallScreen";

// Route wrapper: /audio-call — CallScreen reads the actual mode from
// CallProvider, so the URL only seeds the entry point (mid-call
// audio <-> video switches swap routes but render the same screen).
const AudioCallPage = () => <CallScreen />;

export default AudioCallPage;
