import CallScreen from "../components/CallScreen";

// Route wrapper: /audio-call — real logic lives in CallScreen + CallProvider.
const AudioCallPage = () => <CallScreen isVideo={false} />;

export default AudioCallPage;
