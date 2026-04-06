import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { getMyDetailsThunk } from "../features/profile/api/profileThunk";

const AppInitializer = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getMyDetailsThunk());
  }, [dispatch]);

  return children;
};

export default AppInitializer;