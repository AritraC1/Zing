import { useSelector } from "react-redux";

const useProfileState = () => {
  return useSelector((state) => state.profile);
};

export default useProfileState;