import React from 'react';
import MarsRoverPage from './MarsRoverPage';

const MissionPage = () => {
  // Determine mission type based on authentication
  const isLoggedIn = !!localStorage.getItem("token");
  const missionKey = isLoggedIn ? "loggedIn" : "guest";

  console.log("MissionPage rendering with key:", missionKey);

  return <MarsRoverPage key={missionKey} />;
};

export default MissionPage;