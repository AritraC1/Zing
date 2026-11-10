import CallScreen from "../components/CallScreen";

// Route wrapper: /video-call — CallScreen reads the actual mode from
// CallProvider, so the URL only seeds the entry point (mid-call
// audio <-> video switches swap routes but render the same screen).
const VideoCallPage = () => <CallScreen />;

export default VideoCallPage;
